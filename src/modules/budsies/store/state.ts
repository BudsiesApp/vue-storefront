import { StatisticValuesMetric } from 'src/modules/shared'

import { BudsiesState } from '../types/State'

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
  hospitals: [],
  storeRating: undefined,
  statisticValuesMetric: {
    [StatisticValuesMetric.ORDERED_PLUSHIES_COUNT]: undefined
  }
}
