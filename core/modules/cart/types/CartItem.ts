import Product from '@vue-storefront/core/modules/catalog/types/Product'
import { GiftCardOptions } from 'src/modules/gift-card'
import { CustomerImage } from 'src/modules/shared';

import CartItemOption from './CartItemOption'
import CartItemTotals from './CartItemTotals'
import { ExtensionAttributes } from 'src/modules/customization-system';

export default interface CartItem extends Product {
  qty: number,
  options: CartItemOption[],
  totals: CartItemTotals,
  server_item_id: number | string,
  server_cart_id: any,
  product_type?: string,
  item_id?: number | string,
  checksum?: string,
  quoteId?: string,
  plushieBreed?: string,
  plushieName?: string,
  plushieDescription?: string,
  bodyparts?: Record<string, (string | number)[]>,
  customFields?: object,
  uploadMethod?: string,
  customerImages?: CustomerImage[],
  giftcard_options?: GiftCardOptions,
  upgradeOptionValues?: {
    upgradeSku: string,
    optionsValues: Record<string, string>
  }[],
  customerType?: string,
  participantId?: string,
  participantName?: string,
  parentName?: string,
  hospitalId?: number,
  extension_attributes?: ExtensionAttributes
}
