import Vue from 'vue'
import { StorefrontModule } from '@vue-storefront/core/lib/modules'
import addonFactory from './factories/addon.factory';
import nl2br from './filters/nl2br';
import Addon from './models/addon.model';
import { ProductValue } from './models/product.value';
import ErrorConverterService from './services/error-converter.service';
import { budsiesStore } from './store'
import { Dictionary } from './types/Dictionary.type';
import ObjectBuilderInterface from './types/object-builder.interface';
import { ValueCollection } from './types/value.collection';
import { Value } from './types/value.interface';
import { cacheHandlerFactory } from './helpers/cacheHandler';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'
import { isServer } from '@vue-storefront/core/helpers'
import * as types from './store/mutation-types'
import BaseImage from './components/BaseImage.vue';
import ImageSourceItem from './types/image-source-item.interface';
import ImageAspectRatioSpec from './types/image-aspect-ratio-spec.interface';

export const BudsiesModule: StorefrontModule = async function ({ store }) {
  StorageManager.init(types.SN_BUDSIES);

  store.registerModule('budsies', budsiesStore);

  if (!isServer) {
    store.dispatch('budsies/synchronize');
  }

  store.subscribe(cacheHandlerFactory(Vue));
}

export {
  Addon,
  addonFactory,
  nl2br,
  Dictionary,
  ObjectBuilderInterface,
  ErrorConverterService,
  ProductValue,
  ValueCollection,
  Value,
  BaseImage,
  ImageSourceItem,
  ImageAspectRatioSpec
}
