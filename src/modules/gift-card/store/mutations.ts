import { Dictionary } from 'src/modules/budsies';
import Vue from 'vue';
import { MutationTree } from 'vuex';

import GiftCard from '../types/GiftCard';
import GiftCardState from '../types/GiftCardState';
import GiftCardTemplate from '../types/GiftCardTemplate.interface';
import * as types from '../types/StoreMutations'

export const mutations: MutationTree<GiftCardState> = {
  [types.REMOVE_APPLIED_GIFT_CARD] (state, giftCardCode: string) {
    Vue.delete(state.appliedGiftCard, giftCardCode);
  },
  [types.SET_APPLIED_GIFT_CARD] (state, value: GiftCard) {
    Vue.set(state.appliedGiftCard, value.code, value);
  },
  [types.SET_APPLIED_GIFT_CARDS] (state, giftCards: GiftCard[]) {
    const appliedGiftCard: Dictionary<GiftCard> = {};

    for (const giftCard of giftCards) {
      appliedGiftCard[giftCard.code] = giftCard;
    }

    state.appliedGiftCard = appliedGiftCard;
  },
  [types.UPDATE_GIFT_CARD_TEMPLATE] (state, giftCardTemplate: GiftCardTemplate) {
    Vue.set(state.giftCardTemplate, giftCardTemplate.id, giftCardTemplate);
  },
  [types.UPDATE_GIFT_CARD_TEMPLATE_IDS_BY_STORE_ID] (state, { storeId, giftCardTemplatesIds }: { storeId: string, giftCardTemplatesIds: number[] }) {
    Vue.set(state.giftCardTemplateIdsByStoreId, storeId, giftCardTemplatesIds);
  },
  [types.SET_IS_GIFT_CARD_PROCESSING] (state, value: boolean) {
    state.isGiftCardProcessing = value;
  }
}
