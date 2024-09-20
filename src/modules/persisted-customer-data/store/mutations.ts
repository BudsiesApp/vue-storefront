import Vue from 'vue';
import { MutationTree } from 'vuex';

import { StoreState } from '../types/store-state.interface';
import { SET_LAST_USED_CUSTOMER_EMAIL, SET_LAST_USED_CUSTOMER_FIRST_NAME, SET_LAST_USED_CUSTOMER_LAST_NAME, SET_LAST_USED_CUSTOMER_PHONE_NUMBER, SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY } from '../types/mutation';

export const mutations: MutationTree<StoreState> = {
  [SET_LAST_USED_CUSTOMER_EMAIL] (
    state,
    value?: string
  ): void {
    Vue.set(state, 'email', value);
  },
  [SET_LAST_USED_CUSTOMER_FIRST_NAME] (
    state,
    value?: string
  ): void {
    Vue.set(state, 'firstName', value);
  },
  [SET_LAST_USED_CUSTOMER_LAST_NAME] (
    state,
    value: string
  ): void {
    Vue.set(state, 'lastName', value);
  },
  [SET_LAST_USED_CUSTOMER_PHONE_NUMBER] (
    state,
    value?: string
  ): void {
    Vue.set(state, 'phoneNumber', value);
  },
  [SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY] (
    state,
    value: string
  ): void {
    Vue.set(state, 'shippingCountry', value);
  }
}
