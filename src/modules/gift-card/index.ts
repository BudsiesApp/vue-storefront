import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { StorefrontModule } from '@vue-storefront/core/lib/modules';

import { module } from './store'
import GiftCardTemplateSize from './GiftCardTemplateSize';
import { AMASTY_GIFT_CARD_SKU } from './types/AmastyGiftCardSku';
import { AmGiftCardType } from './types/AmGiftCard.type';
import { AmGiftCardOptions } from './types/AmGiftCardOptions';
import { GiftCardImage } from './types/GiftCardImage';
import GiftCardOptions from './types/GiftCardOptions';
import { SET_APPLIED_GIFT_CARDS } from './types/StoreMutations';

if (typeof URLSearchParams === 'undefined') {
  (global as any).URLSearchParams = require('url').URLSearchParams;
}

export const GiftCardModule: StorefrontModule = function ({ app, store }) {
  store.registerModule('giftCard', module);

  if (!app.$isServer) {
    const onOrderAfterPlacedHandler = () => {
      store.commit(`giftCard/${SET_APPLIED_GIFT_CARDS}`, []);
    }

    EventBus.$on('order-after-placed', onOrderAfterPlacedHandler);
  }
}

export {
  AMASTY_GIFT_CARD_SKU,
  AmGiftCardOptions,
  AmGiftCardType,
  GiftCardTemplateSize,
  GiftCardImage,
  GiftCardOptions
}
