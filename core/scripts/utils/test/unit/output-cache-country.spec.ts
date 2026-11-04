import { serverHarness } from './fixtures/output-cache';
import Vue from 'vue';
import { createRenderer } from 'vue-server-renderer';
import Widget from 'theme/components/customization-system/widgets/production-time-timeline-widget.vue';

const mockCookie = jest.fn();
jest.mock('@vue-storefront/core/application-services', () => ({ useStore: () => ({ getters: { 'budsies/getProductRushAddons': () => [] } }) }));
jest.mock('@vue-storefront/core/request-services', () => ({ useRequestServices: () => ({ getCookie: mockCookie }) }));
jest.mock('src/modules/persisted-customer-data', () => ({ PERSISTED_CUSTOMER_SHIPPING_COUNTRY: 'persisted/country', PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED: 'persisted/settled' }));
jest.mock('theme/helpers/use-error-accessibility', () => ({ useErrorAccessibility: () => ({ errorMessageId: 'error' }) }));
jest.mock('theme/components/customization-system/production-time-option-card.vue', () => ({ render: h => h('span') }));
jest.mock('src/modules/customization-system', () => {
  const { computed } = require('vue');
  return {
    ...require('src/modules/customization-system/composables/use-holiday-delivery-location'),
    ListWidgetInputType: { RADIO: 'radio' },
    PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID: 'standard',
    useListWidget: () => ({ inputType: computed(() => 'radio') }),
    useOptionValuesPrice: () => ({ optionValuePriceDictionary: computed(() => ({})) })
  };
});

function holiday (ctx) {
  ctx.output.cacheTags.add('page');
  return '<p role="status">Loading delivery options…</p>';
}

describe('Country-independent output shares a single response', () => {
  it.each([['US', 'FR', '', undefined], [undefined, '', 'FR', 'US']])('reuses actual Holiday widget SSR for %s %s %s %s', async (...countries) => {
    Vue.prototype.$t = key => key;
    try {
      let html: string;
      let first: string;
      mockCookie.mockClear();
      const h = serverHarness(ctx => { ctx.output.cacheTags.add('page'); return html; });
      for (const country of [...countries, ...countries]) {
        mockCookie.mockReturnValue(country);
        html = await createRenderer().renderToString(new Vue({ render: h => h(Widget, { props: { isHolidayPeriod: true, productId: 1 } }) }));
        if (!first) first = html;
        expect(html).toBe(first);
        expect(html).toContain('Loading delivery options');
        expect(html).not.toMatch(/United States|International|<input|<button/);
        const response = await h.visit('/actual-holiday/', country === undefined ? undefined : 'detected_country=' + country);
        expect(response.body).toBe(first);
      }
      expect(mockCookie).not.toHaveBeenCalled();
      expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
      expect(h.cache.set).toHaveBeenCalledTimes(1);
      expect(h.cache.entries.size).toBe(1);
    } finally {
      delete Vue.prototype.$t;
    }
  });
  it.each([['US', 'FR', '', undefined], [undefined, '', 'FR', 'US']])('reuses neutral output in order %s %s %s %s', async (...countries) => {
    const h = serverHarness(holiday);
    let first;
    for (const country of [...countries, ...countries]) {
      const response = await h.visit('/holiday/', country === undefined ? undefined : 'detected_country=' + country);
      if (!first) first = response.body;
      expect(response.body).toBe(first);
      expect(response.body).not.toMatch(/United States|International|Christmas/);
    }
    expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
    expect([...h.cache.entries.keys()]).toEqual(['page:main:/holiday/']);
    expect(h.cache.entries.get('page:main:/holiday/').entry.kind).toBe('response');
    h.cache.now += 900;
    expect((await h.visit('/holiday/', 'detected_country=FR')).get('x-vs-cache')).toBe('Miss');
  });

  it.each([['US', 'FR'], ['FR', 'US']])('retains non-Holiday sharing for %s then %s', async (first, second) => {
    const h = serverHarness(() => '<p>Shared page</p>');
    await h.visit('/shared/', 'detected_country=' + first);
    expect((await h.visit('/shared/', 'detected_country=' + second)).get('x-vs-cache')).toBe('Hit');
    expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
  });

  it('invalidates page and wildcard tags after reseeding', async () => {
    const h = serverHarness(holiday);
    for (const tag of ['page', '*']) {
      await h.visit('/holiday/', 'detected_country=US');
      await h.visit('/holiday/', 'detected_country=FR');
      expect(h.cache.entries.size).toBe(1);
      expect(h.cache.set.mock.calls[h.cache.set.mock.calls.length - 1][2]).toContain('page');
      await h.invalidate(tag, 'wrong-synthetic-secret');
      expect(h.cache.entries.size).toBe(1);
      await h.invalidate(tag);
      expect(h.cache.entries.size).toBe(0);
      const count = h.renderer.renderToString.mock.calls.length;
      await h.visit('/holiday/', 'detected_country=US');
      expect(h.renderer.renderToString).toHaveBeenCalledTimes(count + 1);
    }
  });
});
