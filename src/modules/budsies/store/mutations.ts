import Vue from 'vue'
import { MutationTree } from 'vuex'
import ExtraPhotoAddon from '../models/extra-photo-addon.model'
import RushAddon from '../models/rush-addon.model'
import BodypartValue from '../models/bodypart-value.model';
import Bodypart from '../models/bodypart.model';
import { BudsiesState } from '../types/State'
import { Dictionary } from '../types/Dictionary.type';
import * as types from './mutation-types';
import BulkorderQuote from '../models/bulkorder-quote.model';
import BulkOrderInfo from '../types/bulk-order-info';
import Hospital from '../types/hospital.interface';
import { StoreRating } from '../types/store-rating.interface';

export const mutations: MutationTree<BudsiesState> = {
  setAddon (state: BudsiesState, { key, addon }: { key: string, addon: ExtraPhotoAddon }) {
    Vue.set(state.extraPhotoAddons, key, addon);
  },
  setPlushieBreeds (state: BudsiesState, items: string[]) {
    state.breeds = [...items];
  },
  setRushAddon (state: BudsiesState, { key, addon }: { key: string, addon: RushAddon }) {
    Vue.set(state.rushAddons, key, addon);
  },
  setPrintedProductAddons (state: BudsiesState, { key, addons }: { key: string, addons: ExtraPhotoAddon[] }) {
    const ids: string[] = [];

    addons.forEach((item) => {
      ids.push(item.id);
      Vue.set(state.extraPhotoAddons, item.id, item);
    });

    Vue.set(state.productExtraPhotoAddons, key, ids);
  },
  setProductRushAddons (state: BudsiesState, { key, addons }: { key: string, addons: RushAddon[] }) {
    const ids: string[] = [];

    addons.forEach((item) => {
      ids.push(item.id);
      Vue.set(state.rushAddons, item.id, item);
    });

    Vue.set(state.productRushAddons, key, ids);
  },
  setBodypart (state: BudsiesState, { key, bodypart }: { key: string, bodypart: Bodypart }) {
    Vue.set(state.bodyparts, key, bodypart);
  },
  setBodypartValue (state: BudsiesState, { key, bodypartValue }: { key: string, bodypartValue: BodypartValue }) {
    Vue.set(state.bodypartsValues, key, bodypartValue);
  },
  setBodypartBodypartsValues (state: BudsiesState, { key, values }: { key: string, values: BodypartValue[] }) {
    const ids: string[] = [];

    values.forEach((item) => {
      ids.push(item.id);
      Vue.set(state.bodypartsValues, item.id, item);
    });

    Vue.set(state.bodypartBodypartsValues, key, ids);
  },
  setProductBodyparts (state: BudsiesState, { key, bodyparts }: { key: string, bodyparts: Bodypart[] }) {
    const ids: string[] = [];

    bodyparts.forEach((item) => {
      ids.push(item.id);
      Vue.set(state.bodyparts, item.id, item);
    });

    Vue.set(state.productBodyparts, key, ids);
  },
  setPlushieShortcode (state: BudsiesState, { key, shortcode }: { key: string, shortcode: string }) {
    Vue.set(state.plushieShortcode, key, shortcode);
  },
  setBulkorderQuotes (state: BudsiesState, { key, quotes }: { key: string, quotes: BulkorderQuote[] }) {
    const ids: number[] = [];

    quotes.forEach((item) => {
      ids.push(item.id);
      Vue.set(state.bulkorderQuotes, item.id, item);
    });

    Vue.set(state.bulkordersQuotes, key, ids);
  },
  setBulkorderInfo (state: BudsiesState, { info }: { info: BulkOrderInfo }) {
    Vue.set(state, 'bulkorderInfo', info);
  },
  [types.CUSTOMER_TYPES_SET] (state: BudsiesState, customerTypes: Dictionary<string> | undefined) {
    Vue.set(state, 'customerTypes', customerTypes);
  },
  [types.HOSPITALS_SET] (state, hospitals: Hospital[]): void {
    state.hospitals = hospitals;
  },
  [types.STORE_RATING_SET] (state, storeRating: StoreRating): void {
    Vue.set(state, 'storeRating', storeRating);
  }
}
