import { Store } from 'vuex';
import VueGtm from 'vue-gtm';
import Product from 'core/modules/catalog/types/Product';
import { PRODUCT_SET_CURRENT } from '@vue-storefront/core/modules/catalog/store/product/mutation-types';
import { CART_ADD_ITEM } from '@vue-storefront/core/modules/cart/store/mutation-types';
import CartItem from 'core/modules/cart/types/CartItem';

import GoogleTagManagerEvents from '../types/GoogleTagManagerEvents';
import { getCartItemPrice } from 'src/modules/shared';
import { prepareCartItemData } from './prepare-cart-item-data.function';
import { prepareProductItemData } from './prepare-product-item-data.function';
import { getFinalPrice, getProductDefaultPrice } from 'src/modules/shared/helpers/price';
import { DEFAULT_CURRENCY } from '../types/default-currency';

export default class StoreMutationsListener {
  public constructor (private store: Store<any>, private gtm: typeof VueGtm) {}

  public initStoreMutationsListener (): void {
    this.store.subscribe(({ type, payload }) => {
      // Adding a Product to a Shopping Cart
      if (type === `cart/${CART_ADD_ITEM}`) {
        this.onCartAddMutationListener(payload)
      }

      if (type === `product/${PRODUCT_SET_CURRENT}`) {
        this.onSetCurrentProductMutationListener(payload);
      }
    })
  }

  private onCartAddMutationListener (payload: {product: CartItem}): void {
    const price = getCartItemPrice(payload.product, {}, false);

    this.gtm.trackEvent({
      event: GoogleTagManagerEvents.ADD_TO_CART,
      ecommerce: {
        currency: this.store.state.cart.platformTotals?.quote_currency_code || DEFAULT_CURRENCY,
        value: getFinalPrice(price),
        items: [
          prepareCartItemData(payload.product)
        ]
      }
    });

    this.gtm.trackEvent({
      event: GoogleTagManagerEvents.ADD_TO_CART_DEPRECATED,
      'addToCart.productID': payload.product.id,
      'addToCart.productSKU': payload.product.sku
    });
  }

  private onSetCurrentProductMutationListener (product: Product) {
    const productCategoriesNames = product.category
      ? product.category.map((category) => category.name).join('|')
      : '';

    this.gtm.trackEvent({
      pageCategory: 'product-detail'
    });

    const price = getProductDefaultPrice(product, {}, false);

    this.gtm.trackEvent({
      event: GoogleTagManagerEvents.VIEW_ITEM,
      ecommerce: {
        currency: DEFAULT_CURRENCY,
        value: getFinalPrice(price),
        items: [
          prepareProductItemData(product)
        ]
      }
    });

    this.gtm.trackEvent({
      ecommerce: {
        detail: {
          actionField: {
            list: 'Catalog'
          },
          products: {
            name: product.name,
            id: product.parentSku,
            price: product.final_price,
            category: productCategoriesNames
          }
        }
      }
    });
  }
}
