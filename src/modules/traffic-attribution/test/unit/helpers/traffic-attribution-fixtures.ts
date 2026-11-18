import { mutations } from '../../../store/mutations';
import { GET_FIRST_TOUCH, GET_LAST_TOUCH } from '../../../types/getters';
import { TouchData, TrafficAttributionData } from '../../../types/traffic-attribution.interface';

export function setReferrer (referrer: string) {
  Object.defineProperty(document, 'referrer', {
    configurable: true,
    value: referrer
  });
}

export function createAttribution (queryParams: Record<string, string> = {}): TrafficAttributionData {
  return {
    landing_page_url: 'http://localhost/landing',
    query_params: queryParams,
    detected_at: '2026-06-06T00:00:00.000Z'
  };
}

export function createTouch (attribution: TrafficAttributionData, deliveredCartId?: string): TouchData {
  return {
    attribution,
    ...(deliveredCartId ? { deliveredCartId } : {}),
    createdAt: Date.now(),
    expiresAt: Date.now() + 100000
  };
}

export function createDeferredTask () {
  let deferredResolve: (value: { resultCode: number }) => void = jest.fn();

  const promise = new Promise<{ resultCode: number }>((resolve) => {
    deferredResolve = resolve;
  });

  return { promise, resolve: deferredResolve };
}

export function createContext (firstTouch: TouchData | null, lastTouch: TouchData | null) {
  const commits: { type: string, payload?: any }[] = [];
  const getters: Record<string, TouchData | null> = {
    [GET_FIRST_TOUCH]: firstTouch,
    [GET_LAST_TOUCH]: lastTouch
  };

  const state = { firstTouch, lastTouch };
  return {
    context: {
      commit: jest.fn((type: string, payload?: any) => {
        commits.push({ type, payload });
        mutations[type](state, payload);
        getters[GET_FIRST_TOUCH] = state.firstTouch;
        getters[GET_LAST_TOUCH] = state.lastTouch;
      }),
      rootGetters: { 'cart/getCartToken': 'A' },
      getters
    } as any,
    commits,
    getters
  };
}
