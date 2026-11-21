import { createAttribution, createTouch, createDeferredTask, createContext, setReferrer } from './helpers/traffic-attribution-fixtures';
import { processURLAddress } from '@vue-storefront/core/helpers';
import { TaskQueue } from '@vue-storefront/core/lib/sync';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import { cacheHandlerFactory } from '../../helpers/cache-handler.factory';
import { MODULE_NAME } from '../../types/store-name';
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

describe('traffic attribution actions', () => {
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
  });

  it('restores and reports an existing stored touch unchanged', async () => {
    const stored = createTouch(createAttribution({ password: 'synthetic', 'direct-crm-ticket': 'example', gclid: 'allowed' }));
    (StorageManager.get as jest.Mock).mockReturnValue({ getItem: jest.fn(key => Promise.resolve(key === FIRST_TOUCH ? stored : null)) });
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });
    const { context, getters } = createContext(null, null);
    await (actions as any)[SYNCHRONIZE](context, { currentRoute: { query: {} } });
    expect(getters[GET_FIRST_TOUCH]).toEqual(stored);
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(JSON.parse((TaskQueue.execute as jest.Mock).mock.calls[0][0].payload.body).request).toEqual(stored.attribution);
  });

  it('initializes first and last touch from the same raw payload when no first touch exists', async () => {
    window.history.pushState({}, '', '/landing?utm_source=google');
    const { context, commits } = createContext(null, null);

    await (actions as any)[SYNCHRONIZE](context, {
      currentRoute: {
        query: { utm_source: 'google' }
      }
    });

    expect(commits.map((commit) => commit.type)).toEqual([SET_FIRST_TOUCH, SET_LAST_TOUCH]);
    expect(commits[0].payload.attribution).toEqual(commits[1].payload.attribution);
    expect(commits[0].payload.deliveredCartId).toBeUndefined();
    expect(commits[0].payload.createdAt).toBe(1000);
  });

  it('initializes first and last touch from a marker-only first landing', async () => {
    window.history.pushState({}, '', '/landing?m-message-click-id=raw%2Bmarker');
    const { context, commits } = createContext(null, null);
    await (actions as any)[SYNCHRONIZE](context, {
      currentRoute: { query: { 'm-message-click-id': 'raw+marker' } }
    });
    expect(commits.map(commit => commit.type)).toEqual([SET_FIRST_TOUCH, SET_LAST_TOUCH]);
    expect(commits[0].payload.attribution.landing_page_url).toBe('http://localhost/landing');
    expect(commits[0].payload.attribution.query_params).toEqual({ 'm-message-click-id': 'raw+marker' });
    expect(commits[0].payload.deliveredCartId).toBeUndefined();
  });

  it('preserves an existing first touch and skips direct last-touch updates', async () => {
    const firstTouch = createTouch(createAttribution({ 'm-message-click-id': 'synthetic' }));
    const lastTouch = createTouch(createAttribution({ utm_source: 'last' }));
    const { context, commits } = createContext(firstTouch, lastTouch);

    await (actions as any)[SYNCHRONIZE](context, {
      currentRoute: {
        query: {}
      }
    });

    expect(commits).toEqual([]);
  });

  it('updates last touch when existing first touch receives a different acquisition landing', async () => {
    const firstTouch = createTouch(createAttribution({ utm_source: 'first' }));
    const lastTouch = createTouch(createAttribution({ utm_source: 'old' }));
    const { context, commits } = createContext(firstTouch, lastTouch);

    await (actions as any)[SYNCHRONIZE](context, {
      currentRoute: {
        query: { gclid: 'new-click' }
      }
    });

    expect(commits).toHaveLength(1);
    expect(commits[0].type).toBe(SET_LAST_TOUCH);
    expect(commits[0].payload.attribution.query_params).toEqual({ gclid: 'new-click' });
  });

  it.each([
    [{ aleid: 'one' }, { aleid: 'one' }],
    [{ alart: 'two' }, { alart: 'two' }],
    [{ 'm-message-click-id': ' raw+click ', token: 'private' }, { 'm-message-click-id': ' raw+click ' }],
    [{ ALEID: 'one', alart: 'two', token: 'private' }, { ALEID: 'one', alart: 'two' }]
  ])('captures and reports identifier-only last touch %o', async (query, expected) => {
    const firstTouch = createTouch(createAttribution({ utm_source: 'google' }));
    const lastTouch = createTouch(createAttribution({ utm_source: 'old' }), 'A');
    const { context, commits, getters } = createContext(firstTouch, lastTouch);
    await (actions as any)[SYNCHRONIZE](context, { currentRoute: { query } });

    expect(getters[GET_FIRST_TOUCH]).toBe(firstTouch);
    expect(commits).toHaveLength(1);
    expect(commits[0].type).toBe(SET_LAST_TOUCH);
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBeUndefined();
    expect(getters[GET_LAST_TOUCH].attribution.query_params).toEqual(expected);
    const firstResponse = createDeferredTask();
    (TaskQueue.execute as jest.Mock).mockReturnValueOnce(firstResponse.promise).mockResolvedValueOnce({ resultCode: 200 });
    const reporting = (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(1);
    expect(context.commit).not.toHaveBeenCalledWith(MARK_FIRST_TOUCH_SENT, { createdAt: 1000, cartId: 'A' });
    firstResponse.resolve({ resultCode: 200 });
    await reporting;
    expect(TaskQueue.execute).toHaveBeenCalledTimes(2);
    expect(JSON.parse((TaskQueue.execute as jest.Mock).mock.calls[0][0].payload.body)).toEqual({ request: firstTouch.attribution });
    expect(JSON.parse((TaskQueue.execute as jest.Mock).mock.calls[1][0].payload.body)).toEqual({
      request: getters[GET_LAST_TOUCH].attribution
    });
    expect(context.commit).toHaveBeenCalledWith(MARK_FIRST_TOUCH_SENT, { createdAt: 1000, cartId: 'A' });
    expect(context.commit).toHaveBeenCalledWith(MARK_LAST_TOUCH_SENT, { createdAt: 1000, cartId: 'A' });
  });

  it('leaves a failed Maestra report unsent', async () => {
    const firstTouch = createTouch(createAttribution({ utm_source: 'first' }), 'A');
    const lastTouch = createTouch(createAttribution({ 'm-message-click-id': 'one' }));
    const { context } = createContext(firstTouch, lastTouch);
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 500 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(1);
    expect(context.commit).not.toHaveBeenCalledWith(MARK_LAST_TOUCH_SENT, { createdAt: 1000, cartId: 'A' });
    expect(lastTouch.deliveredCartId).toBeUndefined();
  });

  it('loads unexpired stored touches during synchronization', async () => {
    const firstTouch = createTouch(createAttribution({ utm_source: 'stored-first' }));
    const lastTouch = createTouch(createAttribution({ gclid: 'stored-last' }));
    const getItem = jest.fn((key: string) => Promise.resolve(
      key === FIRST_TOUCH ? firstTouch : lastTouch
    ));
    (StorageManager.get as jest.Mock).mockReturnValue({ getItem });
    const { context, commits } = createContext(null, null);

    await (actions as any)[SYNCHRONIZE](context, {
      currentRoute: {
        query: {}
      }
    });

    expect(getItem).toHaveBeenCalledWith(FIRST_TOUCH);
    expect(getItem).toHaveBeenCalledWith(LAST_TOUCH);
    expect(commits).toEqual([
      { type: SET_FIRST_TOUCH, payload: firstTouch },
      { type: SET_LAST_TOUCH, payload: lastTouch }
    ]);
  });

  it('clears expired stored touches during synchronization', async () => {
    const expiredFirstTouch = {
      ...createTouch(createAttribution({ utm_source: 'expired-first' })),
      expiresAt: 1000
    };
    const expiredLastTouch = {
      ...createTouch(createAttribution({ gclid: 'expired-last' })),
      expiresAt: 1000
    };
    (StorageManager.get as jest.Mock).mockReturnValue({
      getItem: jest.fn((key: string) => Promise.resolve(
        key === FIRST_TOUCH ? expiredFirstTouch : expiredLastTouch
      ))
    });
    jest.spyOn(Date, 'now').mockReturnValue(2000);
    const { context, commits } = createContext(null, null);

    await (actions as any)[SYNCHRONIZE](context, {
      currentRoute: {
        query: {}
      }
    });

    expect(commits[0]).toEqual({ type: CLEAR_FIRST_TOUCH, payload: undefined });
    expect(commits[1]).toEqual({ type: CLEAR_LAST_TOUCH, payload: undefined });
  });

  it('reuses the in-flight report execution for duplicate report dispatches', async () => {
    const firstTouch = createTouch(createAttribution({ 'm-message-click-id': 'synthetic' }));
    const { context } = createContext(firstTouch, null);
    const deferredTask = createDeferredTask();
    (TaskQueue.execute as jest.Mock).mockReturnValue(deferredTask.promise);

    const firstReport = (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    const secondReport = (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);

    expect(TaskQueue.execute as jest.Mock).toHaveBeenCalledTimes(1);

    deferredTask.resolve({ resultCode: 200 });
    await Promise.all([firstReport, secondReport]);

    expect(context.commit).toHaveBeenCalledTimes(1);
    expect(context.commit).toHaveBeenCalledWith(MARK_FIRST_TOUCH_SENT, { createdAt: 1000, cartId: 'A' });
  });

  it('reports first then different last touch and marks sent only after success', async () => {
    const firstTouch = createTouch(createAttribution({ utm_source: 'first' }));
    const lastTouch = createTouch(createAttribution({ gclid: 'last' }));
    const { context } = createContext(firstTouch, lastTouch);
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });

    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);

    expect(TaskQueue.execute as jest.Mock).toHaveBeenCalledTimes(2);
    expect(JSON.parse((TaskQueue.execute as jest.Mock).mock.calls[0][0].payload.body)).toEqual({ request: firstTouch.attribution });
    expect(JSON.parse((TaskQueue.execute as jest.Mock).mock.calls[1][0].payload.body)).toEqual({ request: lastTouch.attribution });
    expect(context.commit).toHaveBeenCalledWith(MARK_FIRST_TOUCH_SENT, { createdAt: 1000, cartId: 'A' });
    expect(context.commit).toHaveBeenCalledWith(MARK_LAST_TOUCH_SENT, { createdAt: 1000, cartId: 'A' });
  });

  it('suppresses duplicate last-touch reporting when raw payloads match', async () => {
    const firstTouch = createTouch(createAttribution({ gclid: 'same' }));
    const lastTouch = createTouch({
      detected_at: firstTouch.attribution.detected_at,
      query_params: { gclid: 'same' },
      landing_page_url: firstTouch.attribution.landing_page_url
    });
    const { context } = createContext(firstTouch, lastTouch);
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });

    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);

    expect(TaskQueue.execute as jest.Mock).toHaveBeenCalledTimes(1);
    expect(context.commit).toHaveBeenCalledWith(MARK_FIRST_TOUCH_SENT, { createdAt: 1000, cartId: 'A' });
    expect(context.commit).not.toHaveBeenCalledWith(MARK_LAST_TOUCH_SENT, { createdAt: 1000, cartId: 'A' });
  });

  it('delivers A then B then A and suppresses repeated success', async () => {
    const { context, getters } = createContext(createTouch(createAttribution({ gclid: 'first' })), createTouch(createAttribution({ srsltid: 'last' })));
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });
    for (const cartId of ['A', 'A', 'B', 'B', 'A']) {
      context.rootGetters['cart/getCartToken'] = cartId;
      await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
      expect(getters[GET_FIRST_TOUCH].deliveredCartId).toBe(cartId);
      expect(getters[GET_LAST_TOUCH].deliveredCartId).toBe(cartId);
    }
    expect(TaskQueue.execute).toHaveBeenCalledTimes(6);
    for (const [index, [task]] of (TaskQueue.execute as jest.Mock).mock.calls.entries()) {
      const body = task.payload.body;
      const attribution = index % 2 === 0
        ? getters[GET_FIRST_TOUCH].attribution
        : getters[GET_LAST_TOUCH].attribution;
      expect(Object.keys(JSON.parse(body))).toEqual(['request']);
      expect(JSON.parse(body)).toEqual({ request: attribution });
      expect(body).not.toContain('A');
      expect(body).not.toContain('B');
      expect(body).not.toContain('deliveredCartId');
    }
    expect((TaskQueue.execute as jest.Mock).mock.calls.every(call => call.length === 1)).toBe(true);
  });

  it.each([false, true])('first failure skips last and releases retry, rejection=%s', async (reject) => {
    const { context, getters } = createContext(createTouch(createAttribution({ gclid: 'first' })), createTouch(createAttribution({ srsltid: 'last' })));
    if (reject) {
      (TaskQueue.execute as jest.Mock).mockRejectedValueOnce(new Error('failed'));
    } else {
      (TaskQueue.execute as jest.Mock).mockResolvedValueOnce({ resultCode: 500 });
    }
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context).catch(() => {});
    expect(TaskQueue.execute).toHaveBeenCalledTimes(1);
    expect(getters[GET_FIRST_TOUCH].deliveredCartId).toBeUndefined();
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBeUndefined();
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(3);
  });

  it('restoration failure retries only last touch', async () => {
    const { context, getters } = createContext(createTouch(createAttribution({ gclid: 'first' })), createTouch(createAttribution({ srsltid: 'last' }), 'A'));
    (TaskQueue.execute as jest.Mock).mockResolvedValueOnce({ resultCode: 200 }).mockResolvedValueOnce({ resultCode: 500 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(getters[GET_FIRST_TOUCH].deliveredCartId).toBe('A');
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBeUndefined();
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(3);
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBe('A');
  });

  it.each([null, 'replacement'])('stops stale first response after %s', async (replacement) => {
    const { context, getters } = createContext(createTouch(createAttribution({ gclid: 'first' })), createTouch(createAttribution({ srsltid: 'last' }), 'A'));
    const pending = createDeferredTask();
    (TaskQueue.execute as jest.Mock).mockReturnValue(pending.promise);
    const report = (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    if (replacement) {
      context.commit(SET_FIRST_TOUCH, { ...createTouch(createAttribution()), createdAt: 2000 });
    } else {
      context.commit(CLEAR_FIRST_TOUCH);
    }
    pending.resolve({ resultCode: 200 });
    await report;
    expect(TaskQueue.execute).toHaveBeenCalledTimes(1);
    expect(getters[GET_FIRST_TOUCH]?.deliveredCartId).toBeUndefined();
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBe('A');
  });

  it('records pending A response while B independently coalesces', async () => {
    const { context, getters } = createContext(createTouch(createAttribution()), createTouch(createAttribution({ gclid: 'last' })));
    const pendingA = createDeferredTask();
    const pendingB = createDeferredTask();
    (TaskQueue.execute as jest.Mock).mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise).mockResolvedValue({ resultCode: 200 });
    const a = (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    context.rootGetters['cart/getCartToken'] = 'B';
    const b = (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    pendingA.resolve({ resultCode: 200 });
    await a;
    expect(getters[GET_FIRST_TOUCH].deliveredCartId).toBe('A');
    const duplicateB = (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(2);
    pendingB.resolve({ resultCode: 200 });
    await Promise.all([b, duplicateB]);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(3);
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBe('B');
  });

  it.each([null, ''])('does nothing without first touch or cart: %s', async (cart) => {
    const { context } = createContext(cart === null ? null : createTouch(createAttribution()), null);
    context.rootGetters['cart/getCartToken'] = cart === null ? 'A' : cart;
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).not.toHaveBeenCalled();
    expect(context.commit).not.toHaveBeenCalled();
  });

  it('normalizes legacy touches, persists delivery and suppresses after reload', async () => {
    const legacyFirst = { ...createTouch(createAttribution({ gclid: 'first' })), isSent: true };
    const legacyLast = { ...createTouch(createAttribution({ srsltid: 'last' })), isSent: true };
    const saved = { [FIRST_TOUCH]: legacyFirst, [LAST_TOUCH]: legacyLast } as any;
    (StorageManager.get as jest.Mock).mockReturnValue({ getItem: jest.fn(key => Promise.resolve(saved[key])) });
    const { context, getters } = createContext(null, null);
    const cache = cacheHandlerFactory({
      setItem: jest.fn((key, value) => {
        saved[key] = JSON.parse(JSON.stringify(value));
        return Promise.resolve();
      })
    } as any);
    const commit = context.commit;
    context.commit = (type, payload) => {
      commit(type, payload);
      cache({ type, payload }, { [MODULE_NAME]: { firstTouch: getters[GET_FIRST_TOUCH], lastTouch: getters[GET_LAST_TOUCH] } } as any);
    };
    const transportCarts: string[] = [];
    (TaskQueue.execute as jest.Mock).mockImplementation(() => {
      transportCarts.push(context.rootGetters['cart/getCartToken']);
      return Promise.resolve({ resultCode: 200 });
    });
    await (actions as any)[SYNCHRONIZE](context, { currentRoute: { query: {} } });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(getters[GET_FIRST_TOUCH]).not.toHaveProperty('isSent');
    const reloaded = createContext(null, null).context;
    await (actions as any)[SYNCHRONIZE](reloaded, { currentRoute: { query: {} } });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](reloaded);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(2);
    context.rootGetters['cart/getCartToken'] = 'B';
    reloaded.rootGetters['cart/getCartToken'] = 'B';
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](reloaded);
    expect(transportCarts).toEqual(['A', 'A', 'B', 'B']);
    expect(reloaded.getters[GET_FIRST_TOUCH].deliveredCartId).toBe('B');
    expect(reloaded.getters[GET_LAST_TOUCH].deliveredCartId).toBe('B');
    expect(JSON.parse((TaskQueue.execute as jest.Mock).mock.calls[2][0].payload.body)).toEqual({ request: legacyFirst.attribution });
  });

  it('does not mark a last touch replaced while its request is pending', async () => {
    const { context, getters } = createContext(createTouch(createAttribution(), 'A'), createTouch(createAttribution({ gclid: 'old' })));
    const pending = createDeferredTask();
    (TaskQueue.execute as jest.Mock).mockReturnValue(pending.promise);
    const report = (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    context.commit(SET_LAST_TOUCH, { ...createTouch(createAttribution({ gclid: 'new' })), createdAt: 2000 });
    pending.resolve({ resultCode: 200 });
    await report;
    expect(getters[GET_LAST_TOUCH].createdAt).toBe(2000);
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBeUndefined();
  });

  it('stops when cart changes between requests', async () => {
    const { context, getters } = createContext(createTouch(createAttribution()), createTouch(createAttribution({ gclid: 'last' })));
    const commit = context.commit;
    context.commit = jest.fn((type, payload) => {
      commit(type, payload);
      if (type === MARK_FIRST_TOUCH_SENT) {
        context.rootGetters['cart/getCartToken'] = 'B';
      }
    });
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(1);
    expect(getters[GET_FIRST_TOUCH].deliveredCartId).toBe('A');
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBeUndefined();
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(3);
  });

  it('releases a rejected last touch pass for last-only retry', async () => {
    const { context, getters } = createContext(createTouch(createAttribution(), 'A'), createTouch(createAttribution({ gclid: 'last' })));
    (TaskQueue.execute as jest.Mock).mockRejectedValueOnce(new Error('failure'));
    await expect((actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context)).rejects.toThrow('failure');
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(2);
    expect(getters[GET_LAST_TOUCH].deliveredCartId).toBe('A');
  });

  it.each(['A', 'B', null])('clears only matching current last delivery after first mark: %s', async (lastCartId) => {
    const first = createTouch(createAttribution({ gclid: 'first' }));
    const last = lastCartId ? createTouch(createAttribution({ gclid: 'last' }), lastCartId) : null;
    const { context, commits, getters } = createContext(first, last);
    const pending = createDeferredTask();
    (TaskQueue.execute as jest.Mock).mockReturnValueOnce(pending.promise).mockImplementationOnce(() => {
      expect(commits.map(commit => commit.type)).toEqual(lastCartId === 'A'
        ? [MARK_FIRST_TOUCH_SENT, SET_LAST_TOUCH] : [MARK_FIRST_TOUCH_SENT]);
      if (lastCartId === 'A') {
        expect(commits[1].payload).toEqual({ attribution: last.attribution, createdAt: last.createdAt, expiresAt: last.expiresAt });
        expect(getters[GET_LAST_TOUCH]).not.toBe(last);
        expect(getters[GET_LAST_TOUCH]).not.toHaveProperty('deliveredCartId');
      }
      return Promise.resolve({ resultCode: 200 });
    });
    const report = (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    pending.resolve({ resultCode: 200 });
    await report;
    expect(commits.filter(commit => commit.type === SET_LAST_TOUCH)).toHaveLength(lastCartId === 'A' ? 1 : 0);
  });

  it('persists failed restoration as pending and reload retries only last touch', async () => {
    const saved: Record<string, any> = {
      [FIRST_TOUCH]: createTouch(createAttribution({ gclid: 'first' }), 'B'),
      [LAST_TOUCH]: createTouch(createAttribution({ gclid: 'last' }), 'A')
    };
    (StorageManager.get as jest.Mock).mockReturnValue({ getItem: jest.fn(key => Promise.resolve(saved[key])) });
    const { context, getters } = createContext(null, null);
    const cache = cacheHandlerFactory({
      setItem: jest.fn((key, value) => {
        saved[key] = JSON.parse(JSON.stringify(value));
        return Promise.resolve();
      })
    } as any);
    const commit = context.commit;
    context.commit = (type, payload) => {
      commit(type, payload);
      cache({ type, payload }, { [MODULE_NAME]: { firstTouch: getters[GET_FIRST_TOUCH], lastTouch: getters[GET_LAST_TOUCH] } } as any);
    };
    await (actions as any)[SYNCHRONIZE](context, { currentRoute: { query: {} } });
    (TaskQueue.execute as jest.Mock).mockResolvedValueOnce({ resultCode: 200 }).mockResolvedValueOnce({ resultCode: 500 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(saved[FIRST_TOUCH].deliveredCartId).toBe('A');
    expect(saved[LAST_TOUCH]).not.toHaveProperty('deliveredCartId');
    const reloaded = createContext(null, null).context;
    await (actions as any)[SYNCHRONIZE](reloaded, { currentRoute: { query: {} } });
    (TaskQueue.execute as jest.Mock).mockClear().mockResolvedValue({ resultCode: 200 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](reloaded);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(1);
    expect(JSON.parse((TaskQueue.execute as jest.Mock).mock.calls[0][0].payload.body)).toEqual({ request: saved[LAST_TOUCH].attribution });
  });
  it('preserves numeric cart delivery across reload and delivers to another numeric cart', async () => {
    const saved: Record<string, any> = {};
    const { context, getters } = createContext(
      createTouch(createAttribution({ gclid: 'first' })),
      createTouch(createAttribution({ srsltid: 'last' }))
    );
    context.rootGetters['cart/getCartToken'] = 1187986;
    const cache = cacheHandlerFactory({
      setItem: jest.fn((key, value) => {
        saved[key] = JSON.parse(JSON.stringify(value));
        return Promise.resolve();
      })
    } as any);
    const commit = context.commit;
    context.commit = (type, payload) => {
      commit(type, payload);
      cache({ type, payload }, { [MODULE_NAME]: {
        firstTouch: getters[GET_FIRST_TOUCH],
        lastTouch: getters[GET_LAST_TOUCH]
      } } as any);
    };
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200 });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](context);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(2);
    expect(saved[FIRST_TOUCH].deliveredCartId).toBe('1187986');
    expect(saved[LAST_TOUCH].deliveredCartId).toBe('1187986');

    (StorageManager.get as jest.Mock).mockReturnValue({ getItem: jest.fn(key => Promise.resolve(saved[key])) });
    const reloaded = createContext(null, null).context;
    reloaded.rootGetters['cart/getCartToken'] = 1187986;
    await (actions as any)[SYNCHRONIZE](reloaded, { currentRoute: { query: {} } });
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](reloaded);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(2);

    reloaded.rootGetters['cart/getCartToken'] = 1187987;
    await (actions as any)[REPORT_TRAFFIC_ATTRIBUTION](reloaded);
    expect(TaskQueue.execute).toHaveBeenCalledTimes(4);
    expect(reloaded.getters[GET_FIRST_TOUCH].deliveredCartId).toBe('1187987');
    expect(reloaded.getters[GET_LAST_TOUCH].deliveredCartId).toBe('1187987');
  });
});
