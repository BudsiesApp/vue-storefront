import { reactive } from 'vue';
import { useHolidayDeliveryLocation, HolidayDeliveryLocation } from '../../composables/use-holiday-delivery-location';
import { DEFAULT_DELIVERY_COUNTRY, resolveDeliveryCountryBucket } from '../../helpers/resolve-delivery-country-bucket';
import { PERSISTED_CUSTOMER_SHIPPING_COUNTRY } from 'src/modules/persisted-customer-data';

let mockStore;
const mockGetCookie = jest.fn();
jest.mock('@vue-storefront/core/application-services', () => ({ useStore: () => mockStore }));
jest.mock('@vue-storefront/core/request-services', () => ({ useRequestServices: () => ({ getCookie: mockGetCookie }) }));
jest.mock('src/modules/persisted-customer-data', () => ({ PERSISTED_CUSTOMER_SHIPPING_COUNTRY: 'persisted/shippingCountry' }));

describe('Shared country rule agrees with Holiday location', () => {
  it.each([
    ['US', 'US'], ['us', 'US'], [' US ', 'US'], ['FR', 'INTL'],
    ['', 'US'], ['   ', 'US'], [undefined, 'US']
  ])('country %s selects %s', (country, bucket) => {
    mockStore = { getters: reactive({ [PERSISTED_CUSTOMER_SHIPPING_COUNTRY]: undefined }) };
    mockGetCookie.mockReset().mockReturnValue(country);
    const widget = useHolidayDeliveryLocation();
    expect(DEFAULT_DELIVERY_COUNTRY).toBe('US');
    expect(resolveDeliveryCountryBucket(country)).toBe(bucket);
    expect(widget.location.value).toBe(bucket === 'US' ? HolidayDeliveryLocation.DOMESTIC : HolidayDeliveryLocation.INTERNATIONAL);

    mockGetCookie.mockClear();
    mockStore.getters[PERSISTED_CUSTOMER_SHIPPING_COUNTRY] = ' FR ';
    expect(widget.location.value).toBe(HolidayDeliveryLocation.INTERNATIONAL);
    expect(mockGetCookie).not.toHaveBeenCalled();
    mockStore.getters[PERSISTED_CUSTOMER_SHIPPING_COUNTRY] = 'us';
    expect(widget.location.value).toBe(HolidayDeliveryLocation.DOMESTIC);
    widget.setLocation(HolidayDeliveryLocation.INTERNATIONAL);
    expect(widget.location.value).toBe(HolidayDeliveryLocation.INTERNATIONAL);
    mockStore.getters[PERSISTED_CUSTOMER_SHIPPING_COUNTRY] = 'US';
    expect(widget.location.value).toBe(HolidayDeliveryLocation.INTERNATIONAL);
    widget.setLocation(HolidayDeliveryLocation.DOMESTIC);
    expect(widget.location.value).toBe(HolidayDeliveryLocation.DOMESTIC);

    const blankPersisted = useHolidayDeliveryLocation();
    mockStore.getters[PERSISTED_CUSTOMER_SHIPPING_COUNTRY] = '   ';
    expect(blankPersisted.location.value).toBe(bucket === 'US' ? HolidayDeliveryLocation.DOMESTIC : HolidayDeliveryLocation.INTERNATIONAL);
  });
});
