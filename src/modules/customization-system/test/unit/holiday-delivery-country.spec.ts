import { defineComponent, h, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { createRenderer } from 'vue-server-renderer';
import { useHolidayDeliveryLocation, HolidayDeliveryLocation } from '../../composables/use-holiday-delivery-location';
import { resolveDeliveryCountryBucket } from '../../helpers/resolve-delivery-country-bucket';
import { PERSISTED_CUSTOMER_SHIPPING_COUNTRY, PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED } from 'src/modules/persisted-customer-data';

let mockStore;
const mockGetCookie = jest.fn();
jest.mock('@vue-storefront/core/application-services', () => ({ useStore: () => mockStore }));
jest.mock('@vue-storefront/core/request-services', () => ({ useRequestServices: () => ({ getCookie: mockGetCookie }) }));
jest.mock('src/modules/persisted-customer-data', () => ({ PERSISTED_CUSTOMER_SHIPPING_COUNTRY: 'persisted/shippingCountry', PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED: 'persisted/settled' }));

describe('Holiday delivery location', () => {
  let location;
  const Component = defineComponent({
    setup () {
      location = useHolidayDeliveryLocation();
      return () => h('span', location.location.value || 'loading');
    }
  });
  beforeEach(() => {
    mockStore = { getters: reactive({ [PERSISTED_CUSTOMER_SHIPPING_COUNTRY]: undefined, [PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED]: false }) };
    mockGetCookie.mockReset();
  });

  it('renders neutral on the server without reading a cookie', async () => {
    const Vue = require('vue');
    const html = await createRenderer().renderToString(new Vue({ render: create => create(Component) }));
    expect(html).toContain('loading');
    expect(mockGetCookie).not.toHaveBeenCalled();
  });

  it.each([
    ['US', 'US'], ['us', 'US'], [' US ', 'US'], ['FR', 'INTL'],
    ['', 'US'], ['   ', 'US'], [undefined, 'US']
  ])('waits for settlement and resolves %s as %s', async (country, bucket) => {
    mockGetCookie.mockReturnValue(country);
    const wrapper = mount(Component);
    expect(wrapper.text()).toBe('loading');
    expect(mockGetCookie).not.toHaveBeenCalled();
    expect(resolveDeliveryCountryBucket(country)).toBe(bucket);
    mockStore.getters[PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED] = true;
    await wrapper.vm.$nextTick();
    expect(location.location.value).toBe(bucket === 'US' ? HolidayDeliveryLocation.DOMESTIC : HolidayDeliveryLocation.INTERNATIONAL);
    mockStore.getters[PERSISTED_CUSTOMER_SHIPPING_COUNTRY] = ' FR ';
    await wrapper.vm.$nextTick();
    mockGetCookie.mockClear();
    expect(location.location.value).toBe(HolidayDeliveryLocation.INTERNATIONAL);
    expect(mockGetCookie).not.toHaveBeenCalled();
    location.setLocation(HolidayDeliveryLocation.DOMESTIC);
    mockStore.getters[PERSISTED_CUSTOMER_SHIPPING_COUNTRY] = 'US';
    expect(location.location.value).toBe(HolidayDeliveryLocation.DOMESTIC);
    wrapper.destroy();
  });
});
