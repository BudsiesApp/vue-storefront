import { ActionTree } from 'vuex';
import VueRouter, { Route } from 'vue-router';

import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import RootState from 'core/types/RootState';

import { SYNCHRONIZE } from '../types/action';
import { CAMPAIGN_ID, LANDING_PAGE } from '../types/local-storage-key';
import { SET_CAMPAIGN_ID, SET_LANDING_PAGE } from '../types/mutation';
import { SN_MAILCHIMP } from '../types/store-name';
import { StoreState } from '../types/store-state.interface';

function getMailchimpDataFromRoute (route: Route): {
  campaignId?: string,
  isMailchimp: boolean,
  landingPage: string
} {
  const query = route.query;

  return {
    campaignId: query.mc_cid as string,
    isMailchimp: query.utm_source
      ? query.utm_source.includes('mailchimp')
      : false,
    landingPage: window.location.href
  }
}

export const actions: ActionTree<StoreState, RootState> = {
  async [SYNCHRONIZE] ({ commit }, router: VueRouter): Promise<void> {
    const storageManager = StorageManager.get(SN_MAILCHIMP);
    let campaignId = await storageManager.getItem(CAMPAIGN_ID);
    let landingPage = await storageManager.getItem(LANDING_PAGE);

    const mailchimpData = getMailchimpDataFromRoute(router.currentRoute);

    if (mailchimpData.campaignId) {
      campaignId = mailchimpData.campaignId;
      landingPage = mailchimpData.landingPage;
    }

    if (mailchimpData.isMailchimp) {
      campaignId = undefined;
      landingPage = undefined;
    }

    commit(SET_CAMPAIGN_ID, { value: campaignId });
    commit(SET_LANDING_PAGE, { value: landingPage });
  }
}
