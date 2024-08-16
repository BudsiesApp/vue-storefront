import { BudsiesState } from '../types/State'
import { StatisticMetric } from '../types/statistic-metric'

export const state: BudsiesState = {
  extraPhotoAddons: {},
  rushAddons: {},
  productExtraPhotoAddons: {},
  productRushAddons: {},
  bodyparts: {},
  bodypartsValues: {},
  bodypartBodypartsValues: {},
  productBodyparts: {},
  plushieShortcode: {},
  customerEmail: undefined,
  breeds: [],
  bulkorderInfo: undefined,
  bulkorderQuotes: {},
  bulkordersQuotes: {},
  customerTypes: undefined,
  storeRating: undefined,
  statisticValues: {
    [StatisticMetric.ORDERED_PLUSHIES_COUNT]: undefined
  }
}
