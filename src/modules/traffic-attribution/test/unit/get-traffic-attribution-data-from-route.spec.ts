import {
  getTrafficAttributionDataFromRoute,
  hasTrafficAttributionAcquisitionSignal,
  isSameTouchAttribution,
  normalizeTrafficAttributionQueryParams
} from '../../helpers/get-traffic-attribution-data-from-route.function';
import { TrafficAttributionData } from '../../types/traffic-attribution.interface';
import config from 'config';
import fs from 'fs';

jest.mock('config', () => ({
  trafficAttribution: {
    acquisitionClickIdKeys: ['gclid', 'msclkid'],
    ignoredReferrerHosts: ['internal.example', 'paypal.com', 'pay.google.com'],
    sensitiveQueryKeys: [
      'token',
      'email',
      'redirect',
      'order_id',
      'order_item_id',
      'order_item_ids',
      'cart_id',
      'image-url',
      'existing_plushie_id',
      'customization_values'
    ]
  }
}));

function setReferrer (referrer: string) {
  Object.defineProperty(document, 'referrer', {
    configurable: true,
    value: referrer
  });
}

describe('traffic attribution raw capture helpers', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/landing?utm_source=google&token=secret&gclid=abc');
    setReferrer('https://google.com/search?q=plush');
  });

  it('excludes the protected names with shipped, fallback and empty lists', () => {
    const settings = config.trafficAttribution as any;
    const sensitive = settings.sensitiveQueryKeys;
    const acquisition = settings.acquisitionClickIdKeys;
    const template = fs.readFileSync('config/local.json.template', 'utf8');
    const shipped = JSON.parse(template.match(/"sensitiveQueryKeys":\s*(\[[\s\S]*?\])/)[1]);
    const query = { Pass_Word: 'synthetic', DIRECT_CRM_TICKET: 'synthetic2', gclid: 'allowed' };
    try {
      for (const keys of [undefined, shipped, []]) {
        settings.sensitiveQueryKeys = keys;
        expect(normalizeTrafficAttributionQueryParams(query)).toEqual({ gclid: 'allowed' });
      }
      settings.acquisitionClickIdKeys = ['password', 'direct_crm_ticket'];
      expect(hasTrafficAttributionAcquisitionSignal({
        landing_page_url: 'http://localhost/', query_params: query, detected_at: '2026-01-01'
      })).toBe(false);
      expect(query.Pass_Word).toBe('synthetic');
    } finally {
      settings.sensitiveQueryKeys = sensitive;
      settings.acquisitionClickIdKeys = acquisition;
    }
  });

  it('builds a raw touch from the browser landing context and filtered route query', () => {
    const touch = getTrafficAttributionDataFromRoute({
      query: {
        utm_source: 'google',
        gclid: 'abc',
        token: 'secret',
        email: 'buyer@example.com',
        style: ['pet', null, 'plush']
      }
    } as any);

    expect(touch).toEqual({
      landing_page_url: 'http://localhost/landing',
      referrer_url: 'https://google.com/search?q=plush',
      query_params: {
        gclid: 'abc',
        style: 'pet,plush',
        utm_source: 'google'
      },
      detected_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
    });
  });

  it('omits sensitive query parameters while preserving raw attribution values', () => {
    expect(normalizeTrafficAttributionQueryParams({
      redirect: '/checkout',
      msclkid: 'raw-click-id',
      utm_medium: 'cpc'
    } as any)).toEqual({
      msclkid: 'raw-click-id',
      utm_medium: 'cpc'
    });
  });

  it('omits sensitive query parameters across naming variants', () => {
    expect(normalizeTrafficAttributionQueryParams({
      orderId: '1001',
      order_item_id: '2002',
      orderItemIds: '2002,2003',
      cartId: 'quote-1',
      imageUrl: 'https://cdn.example.com/photo.jpg',
      existing_plushie_id: 'plushie-1',
      customization_values: 'encoded-customization-state',
      gclid: 'raw-click-id',
      utm_source: 'google'
    } as any)).toEqual({
      gclid: 'raw-click-id',
      utm_source: 'google'
    });
  });

  it('detects acquisition signals from UTM fields, click IDs, and external referrers', () => {
    const base: TrafficAttributionData = {
      landing_page_url: 'http://localhost/',
      query_params: {},
      detected_at: '2026-06-06T00:00:00.000Z'
    };

    expect(hasTrafficAttributionAcquisitionSignal({
      ...base,
      query_params: { utm_medium: 'cpc' }
    })).toBe(true);

    expect(hasTrafficAttributionAcquisitionSignal({
      ...base,
      query_params: { gclid: 'click-id' }
    })).toBe(true);

    expect(hasTrafficAttributionAcquisitionSignal({
      ...base,
      referrer_url: 'https://search.example/result'
    })).toBe(true);
  });

  it('ignores direct, same-host, and configured internal referrers for acquisition detection', () => {
    const base: TrafficAttributionData = {
      landing_page_url: 'http://localhost/',
      query_params: {},
      detected_at: '2026-06-06T00:00:00.000Z'
    };

    expect(hasTrafficAttributionAcquisitionSignal(base)).toBe(false);
    expect(hasTrafficAttributionAcquisitionSignal({
      ...base,
      referrer_url: 'http://localhost/products'
    })).toBe(false);
    expect(hasTrafficAttributionAcquisitionSignal({
      ...base,
      referrer_url: 'https://internal.example/products'
    })).toBe(false);
  });

  it('ignores configured payment gateway referrers for acquisition detection', () => {
    const base: TrafficAttributionData = {
      landing_page_url: 'http://localhost/',
      query_params: {},
      detected_at: '2026-06-06T00:00:00.000Z'
    };

    expect(hasTrafficAttributionAcquisitionSignal({
      ...base,
      referrer_url: 'https://www.paypal.com/checkoutnow'
    })).toBe(false);
    expect(hasTrafficAttributionAcquisitionSignal({
      ...base,
      referrer_url: 'https://pay.google.com/gp/p/ui/pay'
    })).toBe(false);
  });

  it('treats sibling storefront referrers as acquisition signals', () => {
    expect(hasTrafficAttributionAcquisitionSignal({
      landing_page_url: 'http://localhost/',
      query_params: {},
      detected_at: '2026-06-06T00:00:00.000Z',
      referrer_url: 'https://shop.petsies.com/products'
    })).toBe(true);
  });

  it('compares raw touch payloads without depending on object key order', () => {
    expect(isSameTouchAttribution({
      landing_page_url: 'http://localhost/',
      referrer_url: 'https://google.com',
      query_params: { gclid: '1', utm_source: 'google' },
      detected_at: '2026-06-06T00:00:00.000Z'
    }, {
      detected_at: '2026-06-06T00:00:00.000Z',
      query_params: { utm_source: 'google', gclid: '1' },
      referrer_url: 'https://google.com',
      landing_page_url: 'http://localhost/'
    })).toBe(true);
  });

  it('uses both shipped and fallback AppLovin keys while respecting explicit overrides', () => {
    const settings = config.trafficAttribution as any;
    const original = settings.acquisitionClickIdKeys;
    const template = fs.readFileSync('config/local.json.template', 'utf8');
    const shippedKeys = JSON.parse(template.match(/"acquisitionClickIdKeys":\s*(\[[\s\S]*?\])/)[1]);
    const base: TrafficAttributionData = {
      landing_page_url: 'http://localhost/landing', query_params: {}, detected_at: '2026-06-06T00:00:00.000Z'
    };

    try {
      for (const keys of [undefined, shippedKeys]) {
        settings.acquisitionClickIdKeys = keys;
        for (const query of [{ aleid: 'one' }, { alart: 'two' }, { ALEID: 'one', AlArT: 'two' },
          { gclid: 'existing' }, { utm_source: 'campaign' }]) {
          expect(hasTrafficAttributionAcquisitionSignal({ ...base, query_params: query })).toBe(true);
        }
        const empty = normalizeTrafficAttributionQueryParams({ aleid: '', alart: null } as any);
        expect(empty).toEqual({});
        expect(hasTrafficAttributionAcquisitionSignal({ ...base, query_params: empty })).toBe(false);
      }
      settings.acquisitionClickIdKeys = ['gclid'];
      expect(hasTrafficAttributionAcquisitionSignal({ ...base, query_params: { aleid: 'one', alart: 'two' } })).toBe(false);
      settings.acquisitionClickIdKeys = [];
      expect(hasTrafficAttributionAcquisitionSignal({ ...base, query_params: { aleid: 'one' } })).toBe(false);
    } finally {
      settings.acquisitionClickIdKeys = original;
    }
  });

  it('preserves raw AppLovin context while omitting sensitive and empty values', () => {
    setReferrer('');
    expect(getTrafficAttributionDataFromRoute({
      query: { ALEID: 'one+raw', alart: 'two/raw', token: 'private', utm_source: 'AppLovin', empty: '' }
    } as any)).toEqual({
      landing_page_url: 'http://localhost/landing',
      query_params: { ALEID: 'one+raw', alart: 'two/raw', utm_source: 'AppLovin' },
      detected_at: expect.any(String)
    });
  });
});
