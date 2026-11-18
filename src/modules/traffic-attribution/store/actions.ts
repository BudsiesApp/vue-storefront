import { ActionTree, Commit } from 'vuex';
import VueRouter from 'vue-router';

import config from 'config';
import { processURLAddress } from '@vue-storefront/core/helpers';
import { TaskQueue } from '@vue-storefront/core/lib/sync';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import LocalForageCacheDriver from '@vue-storefront/core/lib/store/storage';
import { Logger } from '@vue-storefront/core/lib/logger';
import RootState from '@vue-storefront/core/types/RootState';

import {
  getTrafficAttributionDataFromRoute,
  hasTrafficAttributionAcquisitionSignal,
  isSameCaptureAttribution,
  isSameTouchAttribution
} from '../helpers/get-traffic-attribution-data-from-route.function';
import { TouchData, TrafficAttributionData } from '../types/traffic-attribution.interface';
import { TrafficAttributionState } from '../types/state.interface';
import { MODULE_NAME } from '../types/store-name';
import { REPORT_TRAFFIC_ATTRIBUTION, SYNCHRONIZE } from '../types/actions';
import { GET_FIRST_TOUCH, GET_LAST_TOUCH } from '../types/getters';
import {
  SET_FIRST_TOUCH,
  SET_LAST_TOUCH,
  MARK_FIRST_TOUCH_SENT,
  MARK_LAST_TOUCH_SENT,
  CLEAR_FIRST_TOUCH,
  CLEAR_LAST_TOUCH
} from '../types/mutations';
import { FIRST_TOUCH, LAST_TOUCH } from '../types/local-storage-key';

function getCartId (rootGetters: Record<string, any>): string {
  const value = rootGetters['cart/getCartToken'];
  return value === null || value === undefined || value === '' ? '' : String(value);
}

async function sendAttribution (attribution: TrafficAttributionData, cartId: string, rootGetters: Record<string, any>): Promise<boolean> {
  const url = processURLAddress(
    `${config.budsies.endpoint}/carts/traffic-attributions?token={{token}}&cartId={{cartId}}`
  );

  if (getCartId(rootGetters) !== cartId) {
    return false;
  }

  const { resultCode } = await TaskQueue.execute({
    url,
    payload: {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ request: attribution })
    },
    silent: true
  });

  if (resultCode !== 200) {
    Logger.error('Error reporting traffic attribution', MODULE_NAME)();
    return false;
  }

  return true;
}

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DEFAULT_FIRST_TOUCH_EXPIRATION_DAYS = 90;
const DEFAULT_LAST_TOUCH_EXPIRATION_DAYS = 30;

function getExpirationDays (days: any, defaultDays: number): number {
  const normalizedDays = Number(days);

  if (normalizedDays > 0) {
    return normalizedDays;
  }

  return defaultDays;
}

function createTouchData (attribution: TrafficAttributionData, expirationDays: number): TouchData {
  const createdAt = Date.now();

  return {
    attribution: { ...attribution },
    createdAt,
    expiresAt: createdAt + expirationDays * DAY_IN_MILLISECONDS
  };
}

function createFirstTouchData (attribution: TrafficAttributionData): TouchData {
  const expirationDays = getExpirationDays(
    config.trafficAttribution && config.trafficAttribution.firstTouchExpirationDays,
    DEFAULT_FIRST_TOUCH_EXPIRATION_DAYS
  );

  return createTouchData(attribution, expirationDays);
}

function createLastTouchData (attribution: TrafficAttributionData): TouchData {
  const expirationDays = getExpirationDays(
    config.trafficAttribution && config.trafficAttribution.lastTouchExpirationDays,
    DEFAULT_LAST_TOUCH_EXPIRATION_DAYS
  );

  return createTouchData(attribution, expirationDays);
}

function isTouchExpired (touch: TouchData): boolean {
  return !touch.expiresAt || touch.expiresAt <= Date.now();
}

async function getStoredTouchData (
  storage: LocalForageCacheDriver,
  key: string
): Promise<TouchData | null> {
  try {
    const touch = await storage.getItem(key);

    return touch || null;
  } catch (reason) {
    Logger.error(reason, MODULE_NAME)();
    return null;
  }
}

const reports = new Map<string, Promise<void>>();

async function reportTrafficAttribution (
  commit: Commit,
  getters: Record<string, any>,
  rootGetters: Record<string, any>,
  cartId: string,
  firstTouch: TouchData,
  lastTouch: TouchData | null
): Promise<void> {
  let firstSent = false;
  if (firstTouch.deliveredCartId !== cartId) {
    const success = await sendAttribution(firstTouch.attribution, cartId, rootGetters);
    if (!success) {
      return;
    }
    commit(MARK_FIRST_TOUCH_SENT, { createdAt: firstTouch.createdAt, cartId });
    const currentFirstTouch: TouchData | null = getters[GET_FIRST_TOUCH];
    if (!currentFirstTouch || currentFirstTouch.createdAt !== firstTouch.createdAt) {
      return;
    }
    const currentLastTouch: TouchData | null = getters[GET_LAST_TOUCH];
    if (currentLastTouch && currentLastTouch.deliveredCartId === cartId) {
      const { deliveredCartId, ...pendingLastTouch } = currentLastTouch;
      commit(SET_LAST_TOUCH, pendingLastTouch);
    }
    firstSent = true;
  }
  if (!lastTouch || isSameTouchAttribution(firstTouch.attribution, lastTouch.attribution)) {
    return;
  }
  if (!firstSent && lastTouch.deliveredCartId === cartId) {
    return;
  }
  const success = await sendAttribution(lastTouch.attribution, cartId, rootGetters);
  if (success) {
    commit(MARK_LAST_TOUCH_SENT, { createdAt: lastTouch.createdAt, cartId });
  }
}

export const actions: ActionTree<TrafficAttributionState, RootState> = {
  async [SYNCHRONIZE] ({ commit, getters }, router: VueRouter): Promise<void> {
    const storage = StorageManager.get(MODULE_NAME);

    const [storedFirstTouch, storedLastTouch] = await Promise.all([
      getStoredTouchData(storage, FIRST_TOUCH),
      getStoredTouchData(storage, LAST_TOUCH)
    ]);

    if (storedFirstTouch) {
      if (isTouchExpired(storedFirstTouch)) {
        commit(CLEAR_FIRST_TOUCH);
      } else {
        commit(SET_FIRST_TOUCH, storedFirstTouch);
      }
    }

    if (storedLastTouch) {
      if (isTouchExpired(storedLastTouch)) {
        commit(CLEAR_LAST_TOUCH);
      } else {
        commit(SET_LAST_TOUCH, storedLastTouch);
      }
    }

    const attribution = getTrafficAttributionDataFromRoute(router.currentRoute);

    if (!attribution) {
      return;
    }

    const currentFirstTouch: TouchData | null = getters[GET_FIRST_TOUCH];

    if (!currentFirstTouch) {
      const firstTouch = createFirstTouchData(attribution);
      const lastTouch = createLastTouchData(attribution);

      commit(SET_FIRST_TOUCH, firstTouch);
      commit(SET_LAST_TOUCH, lastTouch);
      return;
    }

    if (!hasTrafficAttributionAcquisitionSignal(attribution)) {
      return;
    }

    const currentLastTouch: TouchData | null = getters[GET_LAST_TOUCH];
    if (currentLastTouch) {
      if (isSameCaptureAttribution(currentLastTouch.attribution, attribution)) {
        return;
      }
      const seconds = Number(config.trafficAttribution && config.trafficAttribution.lastTouchReplacementCooldownSeconds);
      const elapsed = Date.now() - currentLastTouch.createdAt;
      if (Number.isFinite(seconds) && seconds > 0 && elapsed >= 0 && elapsed < seconds * 1000) {
        return;
      }
    }
    commit(SET_LAST_TOUCH, createLastTouchData(attribution));
  },
  async [REPORT_TRAFFIC_ATTRIBUTION] ({ commit, getters, rootGetters }): Promise<void> {
    const cartId = getCartId(rootGetters);
    if (!cartId) {
      return;
    }
    if (reports.has(cartId)) {
      return reports.get(cartId);
    }
    const firstTouch: TouchData | null = getters[GET_FIRST_TOUCH];
    if (!firstTouch) {
      return;
    }
    const lastTouch: TouchData | null = getters[GET_LAST_TOUCH];
    const report = reportTrafficAttribution(commit, getters, rootGetters, cartId, firstTouch, lastTouch)
      .finally(() => reports.delete(cartId));
    reports.set(cartId, report);
    return report;
  }
};
