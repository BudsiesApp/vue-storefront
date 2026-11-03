import { useStore } from '@vue-storefront/core/application-services';
import { useRequestServices } from '@vue-storefront/core/request-services';
import { computed, ref } from 'vue';
import { resolveDeliveryCountryBucket } from '../helpers/resolve-delivery-country-bucket';

import { DETECTED_COUNTRY_COOKIE_KEY } from 'src/modules/shared/types/detected-country-cookie.key';
import { PERSISTED_CUSTOMER_SHIPPING_COUNTRY } from 'src/modules/persisted-customer-data';

export enum HolidayDeliveryLocation {
  DOMESTIC = 'domestic',
  INTERNATIONAL = 'international'
}

function toDeliveryLocation (country: string | undefined): HolidayDeliveryLocation {
  return resolveDeliveryCountryBucket(country) === 'US'
    ? HolidayDeliveryLocation.DOMESTIC
    : HolidayDeliveryLocation.INTERNATIONAL;
}

export function useHolidayDeliveryLocation () {
  const store = useStore();
  const request = useRequestServices();
  const manualLocation = ref<HolidayDeliveryLocation | undefined>();
  const persistedCountry = computed<string | undefined>(() => {
    return store.getters[PERSISTED_CUSTOMER_SHIPPING_COUNTRY];
  });
  const automaticLocation = computed<HolidayDeliveryLocation>(() => {
    if (persistedCountry.value?.trim()) {
      return toDeliveryLocation(persistedCountry.value);
    }

    const detectedCountry = request.getCookie(DETECTED_COUNTRY_COOKIE_KEY);

    return toDeliveryLocation(detectedCountry);
  });
  const location = computed<HolidayDeliveryLocation>(() => {
    return manualLocation.value || automaticLocation.value;
  });

  function setLocation (value: HolidayDeliveryLocation): void {
    manualLocation.value = value;
  }

  return { location, setLocation };
}
