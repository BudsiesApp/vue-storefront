import Vue from 'vue';
import { MutationTree } from 'vuex';

import { TouchData, TouchDelivery } from '../types/traffic-attribution.interface';
import { TrafficAttributionState } from '../types/state.interface';
import {
  SET_FIRST_TOUCH,
  SET_LAST_TOUCH,
  MARK_FIRST_TOUCH_SENT,
  MARK_LAST_TOUCH_SENT,
  CLEAR_FIRST_TOUCH,
  CLEAR_LAST_TOUCH
} from '../types/mutations';

function normalizeTouch (touch: TouchData): TouchData {
  const { attribution, createdAt, expiresAt, deliveredCartId } = touch;
  return {
    attribution,
    createdAt,
    expiresAt,
    ...(typeof deliveredCartId === 'string' && deliveredCartId.length > 0 ? { deliveredCartId } : {})
  };
}

export const mutations: MutationTree<TrafficAttributionState> = {
  [SET_FIRST_TOUCH] (state, touch: TouchData) {
    state.firstTouch = normalizeTouch(touch);
  },
  [SET_LAST_TOUCH] (state, touch: TouchData) {
    state.lastTouch = normalizeTouch(touch);
  },
  [MARK_FIRST_TOUCH_SENT] (state, { createdAt, cartId }: TouchDelivery) {
    if (!state.firstTouch || state.firstTouch.createdAt !== createdAt) {
      return;
    }
    Vue.set(state.firstTouch, 'deliveredCartId', cartId);
    if (state.lastTouch && state.lastTouch.deliveredCartId === cartId) {
      Vue.delete(state.lastTouch, 'deliveredCartId');
    }
  },
  [MARK_LAST_TOUCH_SENT] (state, { createdAt, cartId }: TouchDelivery) {
    if (!state.lastTouch || state.lastTouch.createdAt !== createdAt) {
      return;
    }
    Vue.set(state.lastTouch, 'deliveredCartId', cartId);
  },
  [CLEAR_FIRST_TOUCH] (state) {
    state.firstTouch = null;
  },
  [CLEAR_LAST_TOUCH] (state) {
    state.lastTouch = null;
  }
};
