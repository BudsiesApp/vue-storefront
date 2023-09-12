import { Getter, GetterTree } from 'vuex'
import RootState from '@vue-storefront/core/types/RootState'
import { BudsiesState } from '../types/State'
import ExtraPhotoAddon from '../models/extra-photo-addon.model'
import RushAddon from '../models/rush-addon.model'
import Bodypart from '../models/bodypart.model'
import BodypartValue from '../models/bodypart-value.model'
import BodypartOption from '../types/bodypart-option'

const getters: GetterTree<BudsiesState, RootState> = {
  getExtraPhotoAddon: (state: BudsiesState, id: string): ExtraPhotoAddon | undefined => {
    return state.extraPhotoAddons[id];
  },
  getPlushieBreeds: (state: BudsiesState): string[] => {
    return [...state.breeds];
  },
  getPrintedProductAddons: (state: BudsiesState) => (id: string): ExtraPhotoAddon[] => {
    const result: ExtraPhotoAddon[] = [];

    if (!state.productExtraPhotoAddons[id] || !state.productExtraPhotoAddons[id].length) {
      return result;
    }

    state.productExtraPhotoAddons[id].forEach((id) => {
      result.push(state.extraPhotoAddons[id]);
    });

    return result;
  },
  getRushAddon: (state: BudsiesState, id: string): RushAddon | undefined => {
    return state.rushAddons[id];
  },
  getProductRushAddons: (state: BudsiesState) => (id: string): RushAddon[] => {
    const result: RushAddon[] = [];

    if (!state.productRushAddons[id] || !state.productRushAddons[id].length) {
      return result;
    }

    state.productRushAddons[id].forEach((id) => {
      result.push(state.rushAddons[id]);
    });

    return result;
  },
  getProductBodyparts: (state: BudsiesState) => (id: string): Bodypart[] => {
    const result: Bodypart[] = [];

    if (!state.productBodyparts[id] || !state.productBodyparts[id].length) {
      return result;
    }

    state.productBodyparts[id].forEach((id) => {
      result.push(state.bodyparts[id]);
    });

    return result;
  },
  getProductsBodyPartsByProductIds: (state: BudsiesState) => (ids: string[]): Bodypart[] => {
    const result: Bodypart[] = [];

    for (const id of ids) {
      if (!state.productBodyparts[id] || !state.productBodyparts[id].length) {
        continue;
      }

      state.productBodyparts[id].forEach((id) => {
        result.push(state.bodyparts[id]);
      });
    }

    return result;
  },
  getBodypartBodypartsValues: (state: BudsiesState) => (id: string): BodypartValue[] => {
    const result: BodypartValue[] = [];

    if (!state.bodypartBodypartsValues[id] || !state.bodypartBodypartsValues[id].length) {
      return result;
    }

    state.bodypartBodypartsValues[id].forEach((id) => {
      result.push(state.bodypartsValues[id]);
    });

    return result;
  },
  getBodypartOptions: (state: BudsiesState, getters: any) => (id: string): BodypartOption[] => {
    const bodypartsValues: BodypartValue[] = getters['getBodypartBodypartsValues'](id);

    if (!bodypartsValues.length) {
      return [];
    }

    const result: BodypartOption[] = [];

    for (const bodypartValue of bodypartsValues) {
      result.push({
        id: bodypartValue.id,
        label: bodypartValue.name,
        value: bodypartValue.code,
        isSelected: false,
        contentTypeId: bodypartValue.contentTypeId,
        color: bodypartValue.color,
        image: bodypartValue.image,
        group: bodypartValue.group
      });
    }

    return result;
  },
  getPlushieShortcode: (state: BudsiesState) => (plushieId: string): string => {
    return state.plushieShortcode[plushieId];
  },
  getCustomerEmail: (state: BudsiesState): string | undefined => {
    return state.customerEmail;
  },
  getPrefilledCustomerEmail: (state: BudsiesState, getters: any, rootState: any, rootGetters: any): string | undefined => {
    let customerEmail = getters.getCustomerEmail;

    if (!customerEmail) {
      customerEmail = rootGetters['user/getUserEmail'];
    }

    return customerEmail;
  },
  getHospitals: (state) => {
    return state.hospitals;
  },
  getStoreRating: (state) => {
    return state.storeRating;
  }
}

export default getters
