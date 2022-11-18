import BulkOrderStatus from './bulk-order-status';

export default interface BulkOrderInfo {
  id: number,
  statusId: BulkOrderStatus,
  description: string,
  size: number,
  bulkorderProductId: number,
  mainImage: string
}
