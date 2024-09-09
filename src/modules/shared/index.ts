import isVue from './is-vue.typeguard';
import { AspectRatio } from './types/aspect-ratio.value';
import { BEFORE_STORE_BACKEND_API_REQUEST } from './types/before-store-backend-api-request.event';
import { BreakpointValue } from './types/breakpoint.value';
import CartEvents from './types/cart-events';
import { InjectType } from './types/inject-type';
import { VideoProvider } from './types/video-provider.value';
import CustomerImage from './types/customer-image.interface';
import { getCartItemPrice, getProductDefaultDiscount, getProductDefaultPrice, getProductPriceFromTotals } from './helpers/price';
import { PAYMENT_ERROR_EVENT } from './types/payment-error-event';
import ServerError from './types/server-error';
import * as ProductEvent from './types/product-events';
import * as PriceHelper from './helpers/price';

import StreamingVideo from './components/streaming-video.vue';
import EmailSubmitForm from './components/email-submit-form.vue';

export {
  InjectType,
  isVue,
  AspectRatio,
  VideoProvider,
  StreamingVideo,
  CustomerImage,
  getCartItemPrice,
  getProductDefaultDiscount,
  getProductDefaultPrice,
  getProductPriceFromTotals,
  ServerError,
  EmailSubmitForm,
  ProductEvent,
  CartEvents,
  PriceHelper,
  BEFORE_STORE_BACKEND_API_REQUEST,
  BreakpointValue,
  PAYMENT_ERROR_EVENT
}
