import { GetterTree } from 'vuex';

import RootState from '@vue-storefront/core/types/RootState'

import { StoreState } from '../types/store-state.interface';
import { LAST_USED_CUSTOMER_EMAIL, LAST_USED_CUSTOMER_FIRST_NAME, LAST_USED_CUSTOMER_LAST_NAME, LAST_USED_CUSTOMER_PHONE_NUMBER, LAST_USED_CUSTOMER_SHIPPING_COUNTRY } from '../types/getter';

export const getters: GetterTree<StoreState, RootState> = {
  [LAST_USED_CUSTOMER_EMAIL] (state, getters, rootState, rootGetters): string {
    const loggedUserEmail = rootGetters['user/getUserEmail'];

    if (loggedUserEmail) {
      return loggedUserEmail;
    }

    return state.email || '';
  },
  [LAST_USED_CUSTOMER_FIRST_NAME] (state, getters, rootState): string {
    const loggedUserFirstName = rootState.user.current?.firstname;

    if (loggedUserFirstName) {
      return loggedUserFirstName;
    }

    return state.firstName || '';
  },
  [LAST_USED_CUSTOMER_LAST_NAME] (state, getters, rootState): string {
    const loggedUserLastName = rootState.user.current?.lastname;

    if (loggedUserLastName) {
      return loggedUserLastName;
    }

    return state.lastName || '';
  },
  [LAST_USED_CUSTOMER_PHONE_NUMBER] (state): string {
    return state.phoneNumber || '';
  },
  [LAST_USED_CUSTOMER_SHIPPING_COUNTRY] (state): string {
    return state.shippingCountry || '';
  }
}
