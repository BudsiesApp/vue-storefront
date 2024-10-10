import { GetterTree } from 'vuex';
import CampaignContent from '../types/CampaignContent.model';

import PromotionPlatformState from '../types/PromotionPlatformState';

export const getters: GetterTree<PromotionPlatformState, any> = {
  campaignContent (state): CampaignContent | undefined {
    return state.campaignContent;
  },
  campaignToken (state): string | undefined {
    return state.campaignToken;
  },
  getProductCampaignDiscountPrice (state): (product: any) => number | undefined {
    return (product) => {
      const campaignContent = state.campaignContent;

      if (!campaignContent || !campaignContent.productDiscountPriceDictionary) {
        return;
      }

      const discountPrice = campaignContent.productDiscountPriceDictionary[product.id];

      if (!discountPrice) {
        return;
      }

      return discountPrice;
    }
  },
  productDiscount (state): Record<string, number> {
    return state.campaignContent?.productDiscountPriceDictionary || {};
  },
  isSynced (state): boolean {
    return state.isSynced;
  },
  lastClosedBannerVersionByUser (state): string | undefined {
    return state.lastClosedBannerVersionByUser;
  },
  productionSpotCountdownExpirationDate (state): number | undefined {
    return state.productionSpotCountdownExpirationDate;
  }
}
