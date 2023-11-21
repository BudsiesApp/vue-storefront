import Vue from 'vue';

import CaliforniaPrivacyNoticeLink from '../components/california-privacy-notice-link.vue';
import NoticeOfFinancialIncentiveLink from '../components/notice-of-financial-incentive-link.vue';
import OptOutLink from '../components/opt-out-link.vue';
import PrivacyPolicyLink from '../components/privacy-policy-link.vue';

export function registerComponents (): void {
  Vue.component('california-privacy-notice-link', CaliforniaPrivacyNoticeLink);
  Vue.component('privacy-policy-link', PrivacyPolicyLink);
  Vue.component('notice-of-financial-incentive-link', NoticeOfFinancialIncentiveLink);
  Vue.component('opt-out-link', OptOutLink);
}
