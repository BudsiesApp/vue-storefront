export default interface GiftCardOptions {
  product: number,
  related_product: string, // empty
  price_amount: number,
  giftcard_template_id: number,
  amount: number,
  send_friend: 0 | 1,
  customer_name: string,
  recipient_name: string,
  recipient_email: string,
  recipient_ship: 'yes' | 'no',
  recipient_address: string,
  message: string,
  notify_success: 0,
  qty: number
}