import { currentStoreView } from '@vue-storefront/core/lib/multistore';
import { Dictionary } from 'src/modules/budsies';
import { ActionTree } from 'vuex';

import { GiftCardService } from '../gift-card.service';
import GiftCard from '../types/GiftCard';
import GiftCardState from '../types/GiftCardState';
import GiftCardTemplate from '../types/GiftCardTemplate.interface';
import { SET_APPLIED_GIFT_CARD, UPDATE_GIFT_CARD_TEMPLATE } from '../types/StoreMutations';

export const actions: ActionTree<GiftCardState, any> = {
  async applyGiftCardCode ({ commit, dispatch, rootGetters }, payload: string): Promise<GiftCard> {
    const cartId = rootGetters['cart/getCartToken'];
    const userToken = rootGetters['user/getToken'];
    const giftCard = await GiftCardService.applyGiftCardCode(payload, cartId, userToken);

    if (giftCard) {
      commit(SET_APPLIED_GIFT_CARD, giftCard);
    }

    await dispatch('cart/syncTotals', { forceServerSync: true }, { root: true });

    return giftCard;
  },
  async changeAppliedGiftCardValue (
    { commit, dispatch, rootGetters },
    { code, value }: { code: string, value: number }
  ): Promise<void> {
    const cartId = rootGetters['cart/getCartToken'];
    const userToken = rootGetters['user/getToken'];
    const giftCard = await GiftCardService.changeAppliedGiftCardValue(
      code,
      value,
      cartId,
      userToken
    );

    await dispatch('cart/syncTotals', { forceServerSync: true }, { root: true });

    commit(SET_APPLIED_GIFT_CARD, giftCard);
  },
  async loadGiftCardsTemplates ({ commit, rootGetters }): Promise<Dictionary<GiftCardTemplate>> {
    const { storeId } = currentStoreView();
    const token = rootGetters['user/getToken'];
    const giftCardTemplates = await GiftCardService.loadGiftCardsTemplates(storeId, token);

    const dictionary: Dictionary<GiftCardTemplate> = {};

    giftCardTemplates.forEach((template) => {
      dictionary[template.id] = template;
      commit(UPDATE_GIFT_CARD_TEMPLATE, template);
    });

    return dictionary;
  },
  async removeAppliedGiftCard ({ commit, dispatch, getters, rootGetters }): Promise<void> {
    const cartId = rootGetters['cart/getCartToken'];
    const userToken = rootGetters['user/getToken'];
    const appliedGiftCard = getters['appliedGiftCard'];

    await GiftCardService.removeAppliedGiftCard(appliedGiftCard ? appliedGiftCard.code : '', cartId, userToken);

    await dispatch('cart/syncTotals', { forceServerSync: true }, { root: true });

    commit(SET_APPLIED_GIFT_CARD, undefined);
  }
}
