export default interface RushAddonApiResponse {
  sku: string,
  text: string,
  price: number,
  turnaround_time: number,
  is_domestic: number,
  is_in_time_for_christmas?: boolean,
  slots_left?: number
}
