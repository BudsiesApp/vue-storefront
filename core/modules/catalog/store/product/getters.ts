import { GetterTree } from 'vuex'
import RootState from '@vue-storefront/core/types/RootState'
import ProductState from '../../types/ProductState'
import { Dictionary } from 'src/modules/budsies';
import { PriceHelper } from 'src/modules/shared';
import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import Product from '../../types/Product';
import { PROMOTION_PLATFORM_PRODUCT_DISCOUNT_GETTER } from 'src/modules/promotion-platform';

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
  getProductPrice: (state, getters, rootState, rootGetters): (product: Product) => PriceHelper.ProductPrice => {
    return (product: Product) => {
      const price: PriceHelper.ProductPrice | undefined = getters['productPriceDictionary'][product.id];
      const productDiscountPriceDictionary = rootGetters[PROMOTION_PLATFORM_PRODUCT_DISCOUNT_GETTER];

      if (price) {
        return price;
      }

      return PriceHelper.getProductDefaultPrice(
        product,
        productDiscountPriceDictionary
      )
    }
  },
  productPriceDictionary: (state, getters, rootState, rootGetters): Dictionary<PriceHelper.ProductPrice> => {
    const loadedProducts = Object.values(state.productBySku);
    const productPrices: Dictionary<PriceHelper.ProductPrice> = {};
    const productDiscountPriceDictionary = rootGetters[PROMOTION_PLATFORM_PRODUCT_DISCOUNT_GETTER];

    for (const product of loadedProducts) {
      if (!product.id) {
        continue;
      }

      productPrices[product.id] = PriceHelper.getProductDefaultPrice(
        product,
        productDiscountPriceDictionary
      );
    }

    return productPrices;
  }
}

export default getters
