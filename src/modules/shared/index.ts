import isVue from './is-vue.typeguard';
import { AspectRatio } from './types/aspect-ratio.value';
import { BEFORE_STORE_BACKEND_API_REQUEST } from './types/before-store-backend-api-request.event';
import { BreakpointValue } from './types/breakpoint.value';
import CartEvents from './types/cart-events';
import { InjectType } from './types/inject-type';
import { VideoProvider } from './types/video-provider.value';
import CustomerImage from './types/customer-image.interface';
import { PAYMENT_ERROR_EVENT } from './types/payment-error-event';
import ServerError from './types/server-error';
import * as ProductEvent from './types/product-events';
import { localStorageSynchronizationFactory } from './helpers/local-storage-synchronization.factory';
import { parseLocalStorageValue } from './helpers/parse-local-storage-value.function';
import * as PriceHelper from './helpers/price';
import * as BundleProductDiscountPrice from './helpers/bundle-product-discount-price';

import StreamingVideo from './components/streaming-video.vue';
import EmailSubmitForm from './components/email-submit-form.vue';
import { getProductOptions } from './helpers/get-product-options.function';

export {
  InjectType,
  isVue,
  AspectRatio,
  VideoProvider,
  StreamingVideo,
  CustomerImage,
  ServerError,
  EmailSubmitForm,
  ProductEvent,
  CartEvents,
  PriceHelper,
  BEFORE_STORE_BACKEND_API_REQUEST,
  BreakpointValue,
  PAYMENT_ERROR_EVENT,
  parseLocalStorageValue,
  localStorageSynchronizationFactory,
  getProductOptions,
  BundleProductDiscountPrice
}
