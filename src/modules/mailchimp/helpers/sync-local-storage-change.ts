import rootStore from '@vue-storefront/core/store'

import { checkMultiStoreLocalStorageKey } from 'src/modules/shared/helpers/check-multi-store-local-storage-key.function';

import { SN_MAILCHIMP } from '../types/store-name';
import { CAMPAIGN_ID, LANDING_PAGE } from '../types/local-storage-key';
import { SET_CAMPAIGN_ID, SET_LANDING_PAGE } from '../types/mutation';

const clearCampaignId = () => {
  rootStore.commit(`${SN_MAILCHIMP}/${SET_CAMPAIGN_ID}`, undefined);
}
const clearLandingPage = () => {
  rootStore.commit(`${SN_MAILCHIMP}/${SET_LANDING_PAGE}`, undefined);
}

function getItemsFromStorage ({ key }: {key: string | null}) {
  if (!key) {
    clearCampaignId();
    clearLandingPage();
    return;
  }

  const isCampaignIdChanged = checkMultiStoreLocalStorageKey(
    key,
    `${SN_MAILCHIMP}/${CAMPAIGN_ID}`
  );
  const isLandingPageChanged = checkMultiStoreLocalStorageKey(
    key,
    `${SN_MAILCHIMP}/${LANDING_PAGE}`
  );

  if (!isCampaignIdChanged && !isLandingPageChanged) {
    return;
  }

  const clearData = () => {
    if (isCampaignIdChanged) {
      clearCampaignId();
    }

    if (isLandingPageChanged) {
      clearLandingPage();
    }
  }

  const rawValue = localStorage[key];

  if (!rawValue) {
    clearData();
    return;
  }

  const value = JSON.parse(rawValue);

  if (!value) {
    clearData();
    return;
  }

  if (isCampaignIdChanged) {
    rootStore.commit(`${SN_MAILCHIMP}/${SET_CAMPAIGN_ID}`, value);
  }

  if (isLandingPageChanged) {
    rootStore.commit(`${SN_MAILCHIMP}/${SET_LANDING_PAGE}`, value);
  }
}

function addEventListener () {
  window.addEventListener('storage', getItemsFromStorage)
}

function removeEventListener () {
  window.removeEventListener('storage', getItemsFromStorage)
}

export {
  addEventListener,
  removeEventListener
}
