import { ref } from 'vue';

import {
  HolidayDeliveryLocation,
  useHolidayDeliveryLocation
} from '../../../composables/use-holiday-delivery-location';

const persistedCountry = ref<string | undefined>();
const getCookie = jest.fn<string | undefined, [string]>();

jest.mock('@vue-storefront/core/application-services', () => ({
  useStore: () => ({
    getters: {
      get 'persisted-customer-data/PERSISTED_CUSTOMER_SHIPPING_COUNTRY' () {
        return persistedCountry.value;
      }
    },
    state: {
      storeView: {
        i18n: {
          defaultCountry: 'CA'
        }
      }
    }
  })
}));

jest.mock('@vue-storefront/core/request-services', () => ({
  useRequestServices: () => ({ getCookie })
}));

describe('useHolidayDeliveryLocation', () => {
  beforeEach(() => {
    persistedCountry.value = undefined;
    getCookie.mockReset();
  });

  it('uses persisted country before cookie and default country', () => {
    persistedCountry.value = 'us';
    getCookie.mockReturnValue('CA');

    expect(useHolidayDeliveryLocation().location.value).toBe(HolidayDeliveryLocation.DOMESTIC);
  });

  it('falls back to the detected country and then the store default', () => {
    getCookie.mockReturnValue('US');
    expect(useHolidayDeliveryLocation().location.value).toBe(HolidayDeliveryLocation.DOMESTIC);

    getCookie.mockReturnValue(undefined);
    expect(useHolidayDeliveryLocation().location.value).toBe(HolidayDeliveryLocation.INTERNATIONAL);
  });

  it('updates with persisted-country changes and keeps a manual choice local', () => {
    const deliveryLocation = useHolidayDeliveryLocation();

    persistedCountry.value = 'US';
    expect(deliveryLocation.location.value).toBe(HolidayDeliveryLocation.DOMESTIC);

    deliveryLocation.setLocation(HolidayDeliveryLocation.INTERNATIONAL);
    persistedCountry.value = 'US';
    expect(deliveryLocation.location.value).toBe(HolidayDeliveryLocation.INTERNATIONAL);
  });
});
