export function isStoryblokPreview (): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.self !== window.top;
}
