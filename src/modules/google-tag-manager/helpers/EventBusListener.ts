import { Store } from 'vuex';
import VueGtm from 'vue-gtm';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import Product from '@vue-storefront/core/modules/catalog/types/Product';
import { Order } from '@vue-storefront/core/modules/order/types/Order';
import { currentStoreView } from '@vue-storefront/core/lib/multistore';
import { cartHooks } from '@vue-storefront/core/modules/cart/hooks';
import { SearchQuery } from 'storefront-query-builder';

import getCookieByName from 'src/modules/shared/helpers/get-cookie-by-name.function';
import CartEvents from 'src/modules/shared/types/cart-events';
import { PlushieWizardEvents } from 'src/modules/budsies';
import { ProductEvent, getCartItemPrice } from 'src/modules/shared';

import CartItem from 'core/modules/cart/types/CartItem';
import PaymentDetails from 'core/modules/checkout/types/PaymentDetails';
import ShippingDetails from 'core/modules/checkout/types/ShippingDetails';

import { getComposedSku } from './get-composed-sku.function';
import { prepareCartItemData } from './prepare-cart-item-data.function';
import { prepareProductItemData } from './prepare-product-item-data.function';
import { prepareProductCategories } from './prepare-product-categories.function';
import { DEFAULT_CURRENCY } from '../types/default-currency';
import GoogleTagManagerEvents from '../types/GoogleTagManagerEvents';

const shareasaleSSCIDCookieName = 'shareasaleMagentoSSCID';

export default class EventBusListener {
  public constructor (private store: Store<any>, private gtm: typeof VueGtm) {}

  public initEventBusListeners (): void {
    EventBus.$on(
      PlushieWizardEvents.PLUSHIE_WIZARD_PHOTOS_PROVIDE,
      this.onPlushieWizardPhotosProvideEventHandler.bind(this)
    );
    EventBus.$on(
      PlushieWizardEvents.PLUSHIE_WIZARD_INFO_FILL,
      this.onPlushieWizardInfoFillEventHandler.bind(this)
    );
    EventBus.$on(
      PlushieWizardEvents.PLUSHIE_WIZARD_TYPE_CHANGE,
      this.onPlushieWizardTypeChangeEventHandler.bind(this)
    );

    EventBus.$on('order-after-placed', this.onOrderAfterPlacedEventHandler.bind(this));
    EventBus.$on('checkout-after-paymentDetails', this.onCheckoutAfterPaymentDetailsEventHandler.bind(this));
    EventBus.$on('checkout-after-personalDetails', this.onCheckoutAfterPersonalDetailsEventHandler.bind(this));
    EventBus.$on('checkout-after-shippingDetails', this.onCheckoutAfterShippingDetailsEventHandler.bind(this));
    EventBus.$on(
      CartEvents.GO_TO_CHECKOUT_FROM_CART,
      () => {
        this.sendBeginCheckoutEvent();
        this.gtm.trackEvent({
          event: GoogleTagManagerEvents.GO_TO_CHECKOUT_FROM_CART
        });
      }
    );
    EventBus.$on('user-after-loggedin', () => {
      this.gtm.trackEvent({
        event: GoogleTagManagerEvents.LOGIN
      })
    });
    EventBus.$on('user-after-register', () => {
      this.gtm.trackEvent({
        event: GoogleTagManagerEvents.SIGN_UP
      })
    });
    EventBus.$on(CartEvents.MAKE_ANOTHER_FROM_CART, this.onMakeAnotherFromCartEventHandler.bind(this))

    cartHooks.afterRemoveFromCart(({ cartItem }) => {
      const price = getCartItemPrice(cartItem, {}, false);
      const finalPrice = price.special && price.special < price.regular
        ? price.special
        : price.regular;

      this.gtm.trackEvent({
        event: GoogleTagManagerEvents.REMOVE_FORM_CART,
        ecommerce: {
          currency: DEFAULT_CURRENCY,
          value: finalPrice,
          items: [prepareCartItemData(cartItem)]
        }
      })
    });

    EventBus.$on(
      ProductEvent.PRODUCT_CARD_CLICK,
      ({
        product,
        categoryName,
        categoryId
      }: {
        product: Product,
        categoryName: string,
        categoryId: string
      }
      ) => {
        this.gtm.trackEvent({
          event: GoogleTagManagerEvents.SELECT_ITEM,
          ecommerce: {
            item_list_id: categoryId,
            item_list_name: categoryName,
            items: [prepareProductItemData(product)]
          }
        })
      }
    );

    EventBus.$on(
      CartEvents.CART_VIEWED,
      ({ products, platformTotals }: {products: CartItem[], platformTotals: any}) => {
        this.gtm.trackEvent({
          event: GoogleTagManagerEvents.VIEW_CART,
          ecommerce: {
            currency: platformTotals?.quote_currency_code || DEFAULT_CURRENCY,
            value: platformTotals?.base_grand_total || 0,
            items: products.map(prepareCartItemData)
          }
        })
      }
    )

    EventBus.$on(
      ProductEvent.PRODUCT_LIST_SHOW,
      ({
        products,
        categoryName,
        categoryId
      }: {
        products: Product[],
        categoryName: string,
        categoryId: string
      }
      ) => {
        this.gtm.trackEvent({
          event: GoogleTagManagerEvents.VIEW_ITEM_LIST,
          ecommerce: {
            item_list_name: categoryName,
            item_list_id: categoryId,
            items: products.map(prepareProductItemData)
          }
        })
      }
    )
  }

  private async loadProducts (productsSkus: string[]): Promise<void> {
    let searchQuery = new SearchQuery();
    searchQuery = searchQuery.applyFilter({ key: 'sku', value: { 'in': productsSkus } })

    await this.store.dispatch(
      'product/findProducts',
      {
        query: searchQuery,
        size: productsSkus.length
      }
    )
  }

  private sendAddPaymentInfoEvent (paymentDetails: PaymentDetails): void {
    const platformTotals = this.store.state.cart.platformTotals;
    const cartItems: CartItem[] = this.store.getters['cart/getCartItems'];

    const data = {
      currency: platformTotals.quote_currency_code,
      value: platformTotals.base_grand_total,
      coupon: platformTotals.coupon_code,
      payment_type: paymentDetails.paymentMethod,
      items: cartItems.map((product) => prepareCartItemData(product as CartItem))
    }

    this.gtm.trackEvent({
      event: GoogleTagManagerEvents.ADD_PAYMENT_INFO,
      ecommerce: data
    })
  }

  private sendAddShippingInfoEvent (shippingDetails: ShippingDetails): void {
    const platformTotals = this.store.state.cart.platformTotals;
    const cartItems: CartItem[] = this.store.getters['cart/getCartItems'];

    const data = {
      currency: platformTotals.quote_currency_code,
      value: platformTotals.base_grand_total,
      coupon: platformTotals.coupon_code,
      shipping_tier: shippingDetails.shippingMethod,
      items: cartItems.map((product) => prepareCartItemData(product as CartItem))
    }

    this.gtm.trackEvent({
      event: GoogleTagManagerEvents.ADD_SHIPPING_INFO,
      ecommerce: data
    })
  }

  private sendBeginCheckoutEvent (): void {
    const platformTotals = this.store.state.cart.platformTotals;
    const cartItems: CartItem[] = this.store.getters['cart/getCartItems'];

    const data = {
      currency: platformTotals.quote_currency_code,
      value: platformTotals.base_grand_total,
      coupon: platformTotals.coupon_code,
      items: cartItems.map((product) => prepareCartItemData(product as CartItem))
    }

    this.gtm.trackEvent({
      event: GoogleTagManagerEvents.BEGIN_CHECKOUT,
      ecommerce: data
    })
  }

  private onCheckoutAfterPaymentDetailsEventHandler (paymentDetails: PaymentDetails) {
    this.sendAddPaymentInfoEvent(paymentDetails);

    const event = GoogleTagManagerEvents.CHECKOUT_SECTION_CHANGE;
    const eventParamName = `${event}.sectionName`;

    this.gtm.trackEvent({
      event,
      [eventParamName]: 'opcBilling'
    });
    this.gtm.trackEvent({
      event,
      [eventParamName]: 'opcPayment'
    });
  }

  private onCheckoutAfterPersonalDetailsEventHandler () {
    this.gtm.trackEvent({
      event: GoogleTagManagerEvents.CHECKOUT_SECTION_CHANGE,
      [`${GoogleTagManagerEvents.CHECKOUT_SECTION_CHANGE}.sectionName`]: 'opcLogin'
    });
  }

  private onCheckoutAfterShippingDetailsEventHandler (shippingDetails: ShippingDetails) {
    this.sendAddShippingInfoEvent(shippingDetails);

    const event = GoogleTagManagerEvents.CHECKOUT_SECTION_CHANGE;
    const eventParamName = `${event}.sectionName`;

    this.gtm.trackEvent({
      event,
      [eventParamName]: 'opcShipping'
    });
    this.gtm.trackEvent({
      event,
      [eventParamName]: 'opcShippingMethod'
    });
  }

  private onPlushieWizardInfoFillEventHandler (plushieType: string) {
    const event = `${plushieType}${GoogleTagManagerEvents.PLUSHIE_WIZARD_INFO_FILL}`;

    this.gtm.trackEvent({
      event
    })
  }

  private onPlushieWizardPhotosProvideEventHandler (
    { uploadMethod, plushieType }:
    { uploadMethod: string, plushieType: string }
  ) {
    const event = `${plushieType}${GoogleTagManagerEvents.PLUSHIE_WIZARD_PHOTOS_PROVIDE}`;

    this.gtm.trackEvent({
      event,
      [`${event}.methodName`]: uploadMethod
    });
  }

  private onPlushieWizardTypeChangeEventHandler ({ plushieType, productType }: {plushieType: string, productType: string}) {
    const event = `${plushieType}${GoogleTagManagerEvents.PLUSHIE_WIZARD_TYPE_CHANGE}`;

    this.gtm.trackEvent({
      event,
      [`${event}.typeName`]: productType
    })
  }

  private onMakeAnotherFromCartEventHandler (productName: string) {
    const event = GoogleTagManagerEvents.MAKE_ANOTHER_FROM_CART
    this.gtm.trackEvent({
      event,
      [`${event}.product`]: productName
    })
  }

  private async sendPurchaseEvent ({
    order,
    confirmation,
    isNewCustomer
  }: {
    order: Order,
    confirmation?: any,
    isNewCustomer: boolean
  }): Promise<void> {
    const { name } = currentStoreView();

    const data = {
      affiliation: name || '',
      currency: order.paymentDetails.order_currency_code,
      transaction_id: confirmation.magentoOrderId,
      value: order.paymentDetails.base_grand_total,
      coupon: order.paymentDetails.coupon_code,
      shipping: order.paymentDetails.base_shipping_amount,
      tax: order.paymentDetails.base_tax_amount,
      items: order.products.map((product) => prepareCartItemData(product as CartItem)),
      shareasale_sscid: getCookieByName(shareasaleSSCIDCookieName),
      is_new_customer: isNewCustomer
    }

    this.gtm.trackEvent({
      event: GoogleTagManagerEvents.PURCHASE,
      ecommerce: data
    });
  }

  private async onOrderAfterPlacedEventHandler ({ order, confirmation }: {order: Order, confirmation?: any}) {
    if (!confirmation) {
      return;
    }

    const ordersHistory = this.store.getters['user/getOrdersHistory'];
    const sessionOrderHashes = this.store.getters['order/getSessionOrderHashes'];
    const currentUser = this.store.state.user.current;
    const orderPaymentDetails = order.paymentDetails;
    const orderPersonalDetails = order.personalDetails;
    const couponCode = orderPaymentDetails.coupon_code ? orderPaymentDetails.coupon_code : '';
    const isNewCustomer = ordersHistory.length <= 1 || sessionOrderHashes <= 1;
    const storeView = currentStoreView();
    const storeName = storeView.name ? storeView.name : '';

    const productsToLoadSkus: string[] = [];
    const productBySkuDictionary = this.store.getters['product/getProductBySkuDictionary'];

    for (const product of order.products) {
      if (!productBySkuDictionary[product.sku]) {
        productsToLoadSkus.push(product.sku);
      }
    }

    if (productsToLoadSkus.length) {
      await this.loadProducts(productsToLoadSkus);
    }

    const productsWithCategories = order.products.map((product) => ({
      ...product,
      category: productBySkuDictionary[product.sku].category
    }))

    const transactionProductsData = productsWithCategories.map((product) => this.prepareTransactionProduct(product as Product));
    const purchaseProductsData = productsWithCategories.map((product) => this.preparePurchaseProduct(product as Product));

    this.sendPurchaseEvent({ order, confirmation, isNewCustomer });

    this.gtm.trackEvent({
      pageCategory: 'order-success'
    });

    this.gtm.trackEvent({
      transactionId: confirmation.magentoOrderId,
      transactionAffiliation: storeName,
      transactionTotal: orderPaymentDetails.base_grand_total,
      transactionTax: orderPaymentDetails.base_tax_amount,
      transactionShipping: orderPaymentDetails.base_shipping_amount,
      transactionProducts: transactionProductsData,
      ecommerce: {
        purchase: {
          actionField: {
            affiliation: storeName,
            coupon: couponCode,
            id: confirmation.magentoOrderId,
            revenue: orderPaymentDetails.base_grand_total,
            shipping: orderPaymentDetails.base_shipping_amount,
            tax: orderPaymentDetails.base_tax_amount
          },
          products: purchaseProductsData
        }
      }
    });

    this.gtm.trackEvent({
      shareasaleSSCID: getCookieByName(shareasaleSSCIDCookieName),
      transactionAffiliateTotal: orderPaymentDetails.base_subtotal - orderPaymentDetails.base_discount_amount,
      transactionCurrency: orderPaymentDetails.order_currency_code,
      transactionIsNewCustomer: isNewCustomer,
      transactionItemsPrices: order.products.map((product) => product.price).join(),
      transactionItemsQuantities: order.products.map((product) => product.qty).join(),
      transactionSKUs: order.products.map(
        (product) => getComposedSku(product as Product)
      ).join(),
      transactionValue: orderPaymentDetails.base_grand_total - orderPaymentDetails.base_shipping_amount - orderPaymentDetails.base_tax_amount
    });

    this.gtm.trackEvent({
      customerEmail: orderPersonalDetails.emailAddress,
      customerFullName: `${orderPersonalDetails.firstName} ${orderPersonalDetails.lastName}`,
      customerId: currentUser ? currentUser.id : ''
    });
  }

  private preparePurchaseProduct (product: Product) {
    return {
      category: prepareProductCategories(product),
      coupon: '',
      name: product.name,
      price: product.price,
      quantity: product.qty,
      id: getComposedSku(product)
    };
  }

  private prepareTransactionProduct (product: Product) {
    return {
      category: prepareProductCategories(product),
      name: product.name,
      price: product.price,
      quantity: product.qty,
      sku: getComposedSku(product)
    };
  }
}
