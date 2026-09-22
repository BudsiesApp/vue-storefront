import { useStore } from '@vue-storefront/core/application-services';
import { useRequestServices } from '@vue-storefront/core/request-services';
import { computed, ref } from 'vue';

import { DETECTED_COUNTRY_COOKIE_KEY } from 'src/modules/shared/types/detected-country-cookie.key';
import { PERSISTED_CUSTOMER_SHIPPING_COUNTRY } from 'src/modules/persisted-customer-data/types/getter';
import { SN_PERSISTED_CUSTOMER_DATA } from 'src/modules/persisted-customer-data/types/store-name';

export enum HolidayDeliveryLocation {
  DOMESTIC = 'domestic',
  INTERNATIONAL = 'international'
}

function toDeliveryLocation (country: string | undefined): HolidayDeliveryLocation {
  return country?.trim().toUpperCase() === 'US'
    ? HolidayDeliveryLocation.DOMESTIC
    : HolidayDeliveryLocation.INTERNATIONAL;
}

export function useHolidayDeliveryLocation () {
  const store = useStore();
  const request = useRequestServices();
  const manualLocation = ref<HolidayDeliveryLocation | undefined>();
  const persistedCountry = computed<string | undefined>(() => {
    return store.getters[`${SN_PERSISTED_CUSTOMER_DATA}/${PERSISTED_CUSTOMER_SHIPPING_COUNTRY}`];
  });
  const automaticLocation = computed<HolidayDeliveryLocation>(() => {
    if (persistedCountry.value?.trim()) {
      return toDeliveryLocation(persistedCountry.value);
    }

    const detectedCountry = request.getCookie(DETECTED_COUNTRY_COOKIE_KEY);

    if (detectedCountry?.trim()) {
      return toDeliveryLocation(detectedCountry);
    }

    const defaultCountry = store.state.storeView?.i18n?.defaultCountry;

    return toDeliveryLocation(defaultCountry);
  });
  const location = computed<HolidayDeliveryLocation>(() => {
    return manualLocation.value || automaticLocation.value;
  });

  function setLocation (value: HolidayDeliveryLocation): void {
    manualLocation.value = value;
  }

  return { location, setLocation };
}
