import Vue from 'vue';

import { StorefrontModule } from '@vue-storefront/core/lib/modules'

import { registerComponents } from './helpers/register-components.function'
import { PrivacyPolicyPluginFactory } from './helpers/privacy-policy.plugin';

export const TrueVaultModule: StorefrontModule = function ({ appConfig }) {
  registerComponents();
  Vue.use(PrivacyPolicyPluginFactory(appConfig));
}
