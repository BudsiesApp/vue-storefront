import { extractCookieValue } from '../../helpers/extract-cookie-value.function';
import { CacheLogger } from './output-cache-types';

interface OutputCacheVariation {
  tag: string;
  resolve: (value: string | undefined) => string;
}

const registrations = new Map<string, OutputCacheVariation>();

export function registerOutputCacheVariation (cookieName: string, variation: OutputCacheVariation): void {
  registrations.set(cookieName, variation);
}

export function resolveOutputCacheVariation (cookieName: string, cookieHeader?: string) {
  const variation = registrations.get(cookieName);
  if (!variation) return null;
  return {
    cookie: cookieName,
    tag: variation.tag,
    bucket: variation.resolve(extractCookieValue(cookieName, cookieHeader))
  };
}

export function resolveOutputCacheDependencies (
  cookieReads: Iterable<string>,
  requestInputs: { cookieHeader?: string; abCookie?: string; logger: CacheLogger }
) {
  const variations: ReturnType<typeof resolveOutputCacheVariation>[] = [];
  const tags = new Set<string>();
  for (const name of Array.from(new Set(cookieReads)).sort()) {
    if (name === requestInputs.abCookie) continue;
    const variation = resolveOutputCacheVariation(name, requestInputs.cookieHeader);
    if (variation) {
      variations.push(variation);
      tags.add(variation.tag);
    } else {
      tags.add('no-cache');
      requestInputs.logger.warn('Unregistered SSR cookie dependency:', name);
    }
  }
  return { variations, tags };
}
