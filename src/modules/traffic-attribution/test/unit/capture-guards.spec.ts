import { createAttribution, createTouch, createDeferredTask, createContext, setReferrer } from './helpers/traffic-attribution-fixtures';
import config from 'config';
import { processURLAddress } from '@vue-storefront/core/helpers';
import { TaskQueue } from '@vue-storefront/core/lib/sync';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import { actions } from '../../store/actions';
import { REPORT_TRAFFIC_ATTRIBUTION, SYNCHRONIZE } from '../../types/actions';
import { GET_FIRST_TOUCH, GET_LAST_TOUCH } from '../../types/getters';
import {
  MARK_FIRST_TOUCH_SENT,
  MARK_LAST_TOUCH_SENT,
  SET_FIRST_TOUCH,
  SET_LAST_TOUCH,
  CLEAR_FIRST_TOUCH,
  CLEAR_LAST_TOUCH
} from '../../types/mutations';
import { FIRST_TOUCH, LAST_TOUCH } from '../../types/local-storage-key';

jest.mock('config', () => ({
  budsies: {
    endpoint: 'https://api.example.com/api/ext/budsies'
  },
  trafficAttribution: {
    firstTouchExpirationDays: 90,
    lastTouchExpirationDays: 30,
    ignoredReferrerHosts: []
  }
}));

jest.mock('@vue-storefront/core/helpers', () => ({
  processURLAddress: jest.fn((url: string) => url)
}));

jest.mock('@vue-storefront/core/lib/sync', () => ({
  TaskQueue: {
    execute: jest.fn()
  }
}));

jest.mock('@vue-storefront/core/lib/storage-manager', () => ({
  StorageManager: {
    get: jest.fn()
  }
}));

jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: {
    error: jest.fn(() => jest.fn())
  }
}));

describe('capture guards', () => {
  beforeEach(() => {
    (processURLAddress as jest.Mock).mockClear();
    (TaskQueue.execute as jest.Mock).mockReset();
    (StorageManager.get as jest.Mock).mockReturnValue({
      getItem: jest.fn().mockResolvedValue(null)
    });
    window.history.pushState({}, '', '/landing');
    setReferrer('');
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    (Date.now as any).mockRestore();
    delete config.trafficAttribution.lastTouchReplacementCooldownSeconds;
  });

  it.each([
    [30, 29999, false], [30, 30000, true], [30, 30001, true],
    [undefined, 1, true], [0, 1, true], [-1, 1, true], ['invalid', 1, true],
    ['30', 29999, false], [30, -1, true]
  ])('cooldown %s at age %s accepts=%s', async (seconds, age, accepted) => {
    config.trafficAttribution.lastTouchReplacementCooldownSeconds = seconds;
    (Date.now as jest.Mock).mockReturnValue(100000);
    const first = createTouch(createAttribution({ gclid: 'first' }), 'A');
    const last = { ...createTouch(createAttribution({ gclid: 'old' }), 'A'), createdAt: 100000 - Number(age) };
    const before = JSON.parse(JSON.stringify({ first, last }));
    const { context, getters, commits } = createContext(first, last);
    await (actions as any)[SYNCHRONIZE](context, { currentRoute: { query: { gclid: 'new' } } });
    expect(commits).toHaveLength(accepted ? 1 : 0);
    expect(getters[GET_FIRST_TOUCH]).toEqual(before.first);
    if (accepted) {
      expect(getters[GET_LAST_TOUCH].deliveredCartId).toBeUndefined();
    } else {
      expect(getters[GET_LAST_TOUCH]).toEqual(before.last);
    }
  });

  it.each([undefined, 30, 0.001])('identical capture is ignored with cooldown %s and reordered keys', async (seconds) => {
    config.trafficAttribution.lastTouchReplacementCooldownSeconds = seconds;
    const first = createTouch(createAttribution({ gclid: 'first' }), 'A');
    const last = createTouch(createAttribution({ gclid: 'same', utm_source: 'same' }), 'A');
    const { context, commits, getters } = createContext(first, last);
    await (actions as any)[SYNCHRONIZE](context, { currentRoute: { query: { utm_source: 'same', gclid: 'same' } } });
    expect(commits).toEqual([]);
    expect(getters[GET_LAST_TOUCH]).toEqual(last);
    context.rootGetters['cart/getCartToken'] = 'B';
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(2);
  });

  it.each([{ gclid: 'paid' }, { srsltid: 'organic' }])('accepts later and suppresses rapid visit %o without extending window', async (query) => {
    config.trafficAttribution.lastTouchReplacementCooldownSeconds = 30;
    const first = createTouch(createAttribution({ gclid: 'first' }), 'A');
    const last = createTouch(createAttribution({ gclid: 'old' }), 'A');
    const { context, commits, getters } = createContext(first, last);
    for (const time of [2000, 30000]) {
      (Date.now as jest.Mock).mockReturnValue(time);
      await (actions as any)[SYNCHRONIZE](context, { currentRoute: { query } });
      expect(commits).toEqual([]);
      expect(getters[GET_LAST_TOUCH]).toEqual(last);
    }
    context.rootGetters['cart/getCartToken'] = 'B';
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(2);
    commits.length = 0;
    (Date.now as jest.Mock).mockReturnValue(31000);
    expect(commits).toEqual([]);
    await (actions as any)[SYNCHRONIZE](context, { currentRoute: { query } });
    expect(commits).toHaveLength(1);
    expect(getters[GET_LAST_TOUCH].attribution.query_params).toEqual(query);
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBeUndefined();
    expect(getters[GET_FIRST_TOUCH]).toEqual(first);
  });

  it('captures missing last touch with cooldown enabled', async () => {
    config.trafficAttribution.lastTouchReplacementCooldownSeconds = 30;
    const { context, commits } = createContext(createTouch(createAttribution()), null);
    await (actions as any)[SYNCHRONIZE](context, { currentRoute: { query: { gclid: 'new' } } });
    expect(commits.map(commit => commit.type)).toEqual([SET_LAST_TOUCH]);
  });
});
