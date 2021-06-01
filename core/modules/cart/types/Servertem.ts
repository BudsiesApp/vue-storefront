import { ProductOptions } from "core/modules/catalog/types/Product";

export default interface ServerItem {
  server_item_id: number | string,
  sku: string,
  server_cart_id: any,
  prev_qty: number,
  product_option: ProductOptions,
  type_id: any,
  plushieId?: string,
  plushieThumb?: string,
  uploadedArtworkIds?: string[]
}
