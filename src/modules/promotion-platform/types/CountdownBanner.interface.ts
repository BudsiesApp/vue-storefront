export interface CountdownBanner {
  date: string,
  is_timer_enabled?: boolean,
  version: string,
  title: string,
  description: string,
  blacklist_urls: string[],
  style: {
    text_color: string,
    numbers_color: string,
    background_color: string
  }
}
