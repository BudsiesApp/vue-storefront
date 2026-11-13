import { withoutCredentialQuery } from '@vue-storefront/core/helpers/credential-query';
import { sanitizeAttribution, sanitizeTouch } from '../../helpers/sanitize-attribution';
import { mutations } from '../../store/mutations';
import { SET_FIRST_TOUCH, SET_LAST_TOUCH, MARK_FIRST_TOUCH_SENT } from '../../types/mutations';
import { cacheHandlerFactory } from '../../helpers/cache-handler.factory';
import { MODULE_NAME } from '../../types/store-name';
import Vue from 'vue';
import Vuex from 'vuex';
import { Logger } from '@vue-storefront/core/lib/logger';

jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));

describe('credential protection', () => {
  const attribution = {
    landing_page_url: 'https://example.test/?%70assword=synthetic&x=a%2Bb#route?direct_crm_ticket=other&ok=1',
    referrer_url: 'https://example.test/#Password=synthetic&keep=x%2Fy',
    query_params: { Pass_Word: 'synthetic', 'DIRECT-CRM-TICKET': 'other', gclid: 'a+b' },
    detected_at: '2026-01-01T00:00:00Z'
  };

  it('filters URL pairs and returns a separate attribution copy', () => {
    const result = sanitizeAttribution(attribution);
    expect(result.query_params).toEqual({ gclid: 'a+b' });
    expect(result.landing_page_url).toBe('https://example.test/?x=a%2Bb#route?ok=1');
    expect(result.referrer_url).toBe('https://example.test/#keep=x%2Fy');
    expect(attribution.query_params.Pass_Word).toBe('synthetic');
    expect(withoutCredentialQuery('https://example.test/?keep=one#reviews')).toBe('https://example.test/?keep=one#reviews');
    expect(withoutCredentialQuery('https://example.test/?password=&%70assword=two&x=a%2Bb'))
      .toBe('https://example.test/?x=a%2Bb');
  });

  it('preserves touch lifecycle while sanitizing mutation ingress', () => {
    const touch = { attribution, isSent: true, createdAt: 1, expiresAt: 2 };
    const sanitized = sanitizeTouch(touch);
    expect(sanitized).toMatchObject({ isSent: true, createdAt: 1, expiresAt: 2 });
    const state: any = { firstTouch: null };
    mutations[SET_FIRST_TOUCH](state, touch);
    expect(state.firstTouch).toEqual(sanitized);
    attribution.query_params.gclid = 'changed';
    expect(state.firstTouch.attribution.query_params.gclid).toBe('a+b');
    attribution.query_params.gclid = 'a+b';
  });

  it.each(['password', 'direct-crm-ticket', 'DIRECT_CRM_TICKET'])('applies bounded fragment precedence for %s at both mutation ingresses', name => {
    const cases = [
      [`route=one?${name}=synthetic&keep=x`, `route=one?${name}=synthetic&keep=x`],
      [`${name}=synthetic?tail&keep=a%2Bb`, 'keep=a%2Bb'],
      [`/page=one?${name}=synthetic&keep=a%2Bb`, '/page=one?keep=a%2Bb'],
      [`route?${name}=synthetic&keep=a%2Bb`, 'route?keep=a%2Bb'],
      [`${name}=&${name}=synthetic&&keep=a%2Bb`, '&keep=a%2Bb']
    ];
    for (const [fragment, expected] of cases) {
      const url = `https://example.test/page?utm_source=allowed#${fragment}`;
      const touch = { attribution: { ...attribution, landing_page_url: url, referrer_url: url }, isSent: false, createdAt: 1, expiresAt: 2 };
      for (const [mutation, key] of [[SET_FIRST_TOUCH, 'firstTouch'], [SET_LAST_TOUCH, 'lastTouch']]) {
        const state: any = { firstTouch: null, lastTouch: null };
        mutations[mutation](state, touch);
        expect(state[key].attribution.landing_page_url).toBe(`https://example.test/page?utm_source=allowed#${expected}`);
        expect(state[key].attribution.referrer_url).toBe(`https://example.test/page?utm_source=allowed#${expected}`);
        expect(touch.attribution.landing_page_url).toBe(url);
        expect(touch.attribution.referrer_url).toBe(url);
      }
    }
  });

  it.each([
    '/page=one&password=synthetic',
    'reviews',
    'route=one%3Fpassword%3Dsynthetic&keep=x'
  ])('preserves name-independent fragment %s at both mutation ingresses', fragment => {
    const url = `https://example.test/page?utm_source=allowed#${fragment}`;
    const touch = { attribution: { ...attribution, landing_page_url: url, referrer_url: url }, isSent: false, createdAt: 1, expiresAt: 2 };
    for (const [mutation, key] of [[SET_FIRST_TOUCH, 'firstTouch'], [SET_LAST_TOUCH, 'lastTouch']]) {
      const state: any = { firstTouch: null, lastTouch: null };
      mutations[mutation](state, touch);
      expect(state[key].attribution.landing_page_url).toBe(url);
      expect(state[key].attribution.referrer_url).toBe(url);
      expect(touch.attribution.landing_page_url).toBe(url);
      expect(touch.attribution.referrer_url).toBe(url);
    }
  });

  it('subscribes after real Vuex commits and never persists the original touch', () => {
    Vue.use(Vuex);
    const storage: any = { setItem: jest.fn().mockResolvedValue(undefined) };
    const store = new Vuex.Store<any>({
      modules: { [MODULE_NAME]: { namespaced: true, state: { firstTouch: null }, mutations } }
    });
    store.subscribe(cacheHandlerFactory(storage));
    const touch = { attribution, isSent: false, createdAt: 1, expiresAt: 2 };
    store.commit(MODULE_NAME + '/' + SET_FIRST_TOUCH, touch);
    store.commit(MODULE_NAME + '/' + MARK_FIRST_TOUCH_SENT);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(storage.setItem.mock.calls)).not.toMatch(/synthetic|other/);
    expect(storage.setItem.mock.calls[0][1]).toMatchObject({ createdAt: 1, expiresAt: 2 });
    expect(storage.setItem.mock.calls[1][1]).toMatchObject({ isSent: true, createdAt: 1, expiresAt: 2 });
    expect(storage.setItem.mock.calls[0][1].attribution.query_params).toEqual({ gclid: 'a+b' });
    expect(store.state[MODULE_NAME].firstTouch.isSent).toBe(true);
    expect(touch.isSent).toBe(false);
  });

  it('does not log a storage error containing credential material', async () => {
    const storage: any = { setItem: jest.fn().mockRejectedValue(new Error('synthetic')) };
    const state: any = { firstTouch: null };
    mutations[SET_FIRST_TOUCH](state, { attribution, isSent: false, createdAt: 1, expiresAt: 2 });
    cacheHandlerFactory(storage)({ type: MODULE_NAME + '/' + SET_FIRST_TOUCH }, { [MODULE_NAME]: state } as any);
    await Promise.resolve();
    expect(Logger.error).toHaveBeenCalledWith('Error writing first touch', MODULE_NAME);
    expect(JSON.stringify((Logger.error as jest.Mock).mock.calls)).not.toContain('synthetic');
  });
});
