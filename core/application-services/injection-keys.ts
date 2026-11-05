import { InjectionKey } from 'vue';
import VueRouter from 'vue-router';
import { Store } from 'vuex';

import RootState from '@vue-storefront/core/types/RootState';

import { I18nAdapter, RouteView } from './types';

export const storeInjectionKey: InjectionKey<Store<RootState>> =
  Symbol.for('budsies.storefront.store');
export const routerInjectionKey: InjectionKey<VueRouter> =
  Symbol.for('budsies.storefront.router');
export const routeInjectionKey: InjectionKey<RouteView> =
  Symbol.for('budsies.storefront.route');
export const i18nInjectionKey: InjectionKey<I18nAdapter> =
  Symbol.for('budsies.storefront.i18n');
