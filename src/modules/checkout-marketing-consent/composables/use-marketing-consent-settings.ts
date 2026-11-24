import { computed } from 'vue';

import { useStore } from '@vue-storefront/core/application-services';

import { consentAvailability } from '../helpers';
import { ConsentAvailability, MarketingConsentSettings } from '../types/marketing-consent';

const SETTINGS_GETTER = 'backend-settings/getSettingByCompositeKey';
const SETTINGS_KEY = 'marketingConsent';

export function useMarketingConsentSettings () {
  const store = useStore();

  const settings = computed<MarketingConsentSettings | undefined>(() => {
    return store.getters[SETTINGS_GETTER](SETTINGS_KEY);
  });
  const offered = computed<ConsentAvailability>(() => consentAvailability(settings.value));

  return {
    settings,
    offered
  };
}
