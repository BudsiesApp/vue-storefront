import { Dictionary } from 'src/modules/budsies';
import { CampaignContentI } from './CamaignContent.interface';
import ImageBanner from './ImageBanner.model';

export default class CampaignContent implements CampaignContentI {
  public constructor (
    private fCountdownBannerContent?: string,
    private fProductDiscountPriceDictionary?: Dictionary<number>,
    private fImageBanner?: ImageBanner,
    private fCountdownBannerBlacklistUrls: string[] = []
  ) {}

  public get countdownBannerContent (): string | undefined {
    return this.fCountdownBannerContent;
  }

  public get countdownBannerBlacklistUrls (): string [] {
    return this.fCountdownBannerBlacklistUrls;
  }

  public get productDiscountPriceDictionary (): Dictionary<number> | undefined {
    return this.fProductDiscountPriceDictionary;
  }

  public get imageBanner (): ImageBanner | undefined {
    return this.fImageBanner;
  }

  public toPlainObject (): CampaignContentI {
    return {
      countdownBannerContent: this.countdownBannerContent,
      productDiscountPriceDictionary: this.productDiscountPriceDictionary,
      imageBanner: this.imageBanner?.toPlainObject() || undefined,
      countdownBannerBlacklistUrls: this.countdownBannerBlacklistUrls
    }
  }

  public static fromPlainObject (payload: CampaignContentI): CampaignContent {
    return new CampaignContent(
      payload.countdownBannerContent,
      payload.productDiscountPriceDictionary,
      payload.imageBanner ? ImageBanner.fromPlainObject(payload.imageBanner) : undefined,
      payload.countdownBannerBlacklistUrls
    )
  }
}
