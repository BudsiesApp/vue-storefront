export default function getProductImagePlaceholder (): string {
  const baseUrl = (typeof window !== 'undefined' && window.location) ? `${window.location.protocol}//${window.location.host}` : ''

  return baseUrl + '/assets/placeholder.jpg'
}
