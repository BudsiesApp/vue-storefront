export default interface BulkorderQuoteApiResponse {
  id: number,
  bulkorder_id: number,
  qty: number,
  production_price: number,
  shipping_price: number,
  production_time?: number
}
