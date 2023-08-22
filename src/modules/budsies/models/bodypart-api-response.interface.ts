export default interface BodypartApiResponse {
  id: number,
  code: string,
  name: string,
  is_required: number,
  max_values: number,
  sn: number,
  product_id: number,
  detailing_flag_text?: string,
  child_bodyparts?: BodypartApiResponse[]
}
