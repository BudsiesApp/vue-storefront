import BulkOrderStatus from './bulk-order-status';
import BulkorderQuoteProductId from './bulkorder-quote-product-id';

export default interface BulkOrderInfo {
  id: number,
  statusId: BulkOrderStatus,
  description: string,
  size: number,
  bulkorderProductId: BulkorderQuoteProductId,
  mainImage: string
}
