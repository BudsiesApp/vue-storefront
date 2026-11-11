import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem'
import type Totals from '@vue-storefront/core/modules/cart/types/Totals'
import type { ExtensionAttributes } from 'src/modules/customization-system'

type TotalsItem = Totals & {
  extension_attributes?: Pick<ExtensionAttributes, 'budsies_quote_item_totals'>
}

interface TotalsItemUpdate {
  server_item_id: TotalsItem['item_id'],
  totals: TotalsItem,
  qty: number,
  extension_attributes?: ExtensionAttributes
}

export function createTotalsItemUpdate (totalsItem: TotalsItem, cartItems: CartItem[]): TotalsItemUpdate {
  const update: TotalsItemUpdate = {
    server_item_id: totalsItem.item_id,
    totals: totalsItem,
    qty: totalsItem.qty
  }
  const itemTotals = totalsItem.extension_attributes?.budsies_quote_item_totals

  if (!itemTotals) {
    return update
  }

  const cartItem = cartItems.find((item) => item.server_item_id === totalsItem.item_id)

  if (!cartItem) {
    return update
  }

  return {
    ...update,
    extension_attributes: {
      ...cartItem.extension_attributes,
      budsies_quote_item_totals: itemTotals
    }
  }
}
