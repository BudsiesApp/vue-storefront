import Vue from 'vue';
import { MutationTree } from 'vuex';

import { StoreState } from '../types/store-state.interface';
import { SET_LAST_USED_CUSTOMER_EMAIL, SET_LAST_USED_CUSTOMER_FIRST_NAME, SET_LAST_USED_CUSTOMER_LAST_NAME, SET_LAST_USED_CUSTOMER_PHONE_NUMBER, SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY } from '../types/mutation';

interface Payload {
  value?: string,
  avoidPersistInLocalStorage?: boolean
}

export const mutations: MutationTree<StoreState> = {
  [SET_LAST_USED_CUSTOMER_EMAIL] (
    state,
    payload: Payload = {}
  ): void {
    Vue.set(state, 'email', payload.value);
  },
  [SET_LAST_USED_CUSTOMER_FIRST_NAME] (
    state,
    payload: Payload = {}
  ): void {
    Vue.set(state, 'firstName', payload.value);
  },
  [SET_LAST_USED_CUSTOMER_LAST_NAME] (
    state,
    payload: Payload = {}
  ): void {
    Vue.set(state, 'lastName', payload.value);
  },
  [SET_LAST_USED_CUSTOMER_PHONE_NUMBER] (
    state,
    payload: Payload = {}
  ): void {
    Vue.set(state, 'phoneNumber', payload.value);
  },
  [SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY] (
    state,
    payload: Payload = {}
  ): void {
    Vue.set(state, 'shippingCountry', payload.value);
  }
}
