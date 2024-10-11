import { GetterTree } from 'vuex'
import RootState from '@vue-storefront/core/types/RootState'
import ProductState from '../../types/ProductState'
import { Dictionary } from 'src/modules/budsies';
import { PriceHelper } from 'src/modules/shared';
import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import Product from '../../types/Product';

const getters: GetterTree<ProductState, RootState> = {
  getCurrentProduct: state => state.current,
  getCurrentProductConfiguration: state => state.current_configuration,
  getCurrentProductOptions: state => state.current_options,
  getOriginalProduct: (state, getters) => {
    if (!getters.getCurrentProduct) return null
    return state.original || {
      ...getters.getCurrentProduct,
      id: getters.getCurrentProduct.parentId || getters.getCurrentProduct.id
    }
  },
  getParentProduct: state => state.parent,
  getProductsSearchResult: state => state.list,
  getProducts: (state, getters) => getters.getProductsSearchResult.items,
  getProductGallery: state => state.productGallery,
  getProductRelated: state => state.related,
  getCurrentCustomOptions: state => state.current_custom_options,
  getProductBySkuDictionary: state => state.productBySku,
  getCurrentBundleOptions: state => state.current_bundle_options,
  getProductPrice: (state, getters): (product: Product) => PriceHelper.ProductPrice => {
    return (product: Product) => {
      const price: PriceHelper.ProductPrice | undefined = getters['productPriceDictionary'][product.id];
      const productDiscount = state.productDiscount ? state.productDiscount.value : {};

      if (price) {
        return price;
      }

      return PriceHelper.getProductDefaultPrice(
        product,
        productDiscount
      )
    }
  },
  getProductDiscount: (state, getters): (product: Product) => PriceHelper.ProductDiscount => {
    return (product: Product) => {
      const discount: PriceHelper.ProductDiscount | undefined = getters['productDiscountDictionary'][product.id];

      if (discount) {
        return discount;
      }

      const price: PriceHelper.ProductPrice = getters['getProductPrice'](product);

      return PriceHelper.getProductDiscount(price);
    }
  },
  productPriceDictionary: (state): Dictionary<PriceHelper.ProductPrice> => {
    const loadedProducts = Object.values(state.productBySku);
    const productPrices: Dictionary<PriceHelper.ProductPrice> = {};
    const productDiscount = state.productDiscount ? state.productDiscount.value : {};

    for (const product of loadedProducts) {
      if (!product.id) {
        continue;
      }

      productPrices[product.id] = PriceHelper.getProductDefaultPrice(
        product,
        productDiscount
      );
    }

    return productPrices;
  },
  productDiscountDictionary: (state, getters): Dictionary<PriceHelper.ProductDiscount> => {
    const productDiscountDictionary: Dictionary<PriceHelper.ProductDiscount> = {};
    const productPriceDictionary: Dictionary<PriceHelper.ProductPrice> = getters['productPriceDictionary'];

    Object.keys(
      productPriceDictionary
    ).forEach((key) => {
      const productPrice = productPriceDictionary[key];

      if (!productPrice) {
        return;
      }

      productDiscountDictionary[key] = PriceHelper.getProductDiscount(productPrice);
    });

    return productDiscountDictionary;
  },
  cartItemPriceDictionary: (
    state,
    getters,
    rootState,
    rootGetters
  ): Dictionary<PriceHelper.ProductPrice> => {
    // TODO: move to the cart module
    const cartItems: CartItem[] = rootGetters['cart/getCartItems'];
    const cartItemPrices: Dictionary<PriceHelper.ProductPrice> = {};
    const productDiscount = state.productDiscount ? state.productDiscount.value : {};

    for (const cartItem of cartItems) {
      if (!cartItem.checksum) {
        continue;
      }

      cartItemPrices[cartItem.checksum] = PriceHelper.getCartItemPrice(
        cartItem,
        productDiscount
      );
    }

    return cartItemPrices;
  },
  cartItemDiscountDictionary: (state, getters): Dictionary<PriceHelper.ProductDiscount> => {
    const productDiscountDictionary: Dictionary<PriceHelper.ProductDiscount> = {};
    const cartItemPriceDictionary: Dictionary<PriceHelper.ProductPrice> = getters['cartItemPriceDictionary'];

    Object.keys(
      cartItemPriceDictionary
    ).forEach((key) => {
      const cartItemPrice = cartItemPriceDictionary[key];

      if (!cartItemPrice) {
        return;
      }

      productDiscountDictionary[key] = PriceHelper.getProductDiscount(cartItemPrice);
    });

    return productDiscountDictionary;
  },
  getCartItemPrice: (state, getters): (cartItem: CartItem) => PriceHelper.ProductPrice => {
    return (cartItem: CartItem) => {
      const price: PriceHelper.ProductPrice | undefined =
        cartItem.checksum
          ? getters['cartItemPriceDictionary'][cartItem.checksum]
          : undefined;

      const productDiscount = state.productDiscount ? state.productDiscount.value : {};

      if (price) {
        return price;
      }

      return PriceHelper.getCartItemPrice(
        cartItem,
        productDiscount
      )
    }
  },
  getCartItemDiscount: (state, getters): (cartItem: CartItem) => PriceHelper.ProductDiscount => {
    return (cartItem: Product) => {
      const discount: PriceHelper.ProductDiscount | undefined = getters['cartItemDiscountDictionary'][cartItem.id];

      if (discount) {
        return discount;
      }

      const price: PriceHelper.ProductPrice = getters['getCartItemPrice'](cartItem);

      return PriceHelper.getProductDiscount(price);
    }
  },
}

export default getters
