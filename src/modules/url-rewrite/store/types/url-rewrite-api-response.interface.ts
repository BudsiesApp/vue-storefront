export interface UrlRewriteApiResponse {
  id: number,
  idPath: string,
  request_path: string,
  target_path: string,
  rewrite_options?: string
}
