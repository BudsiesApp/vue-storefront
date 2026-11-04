import { extractCookieValue } from '../../helpers/extract-cookie-value.function';
import { buildPageCacheKey, splitPageCacheUrl } from './page-cache-key';
import { CacheLogger, CacheRequest, CacheWriteInput, CachedResponse, OutputCacheConfig, OutputCacheStorage } from './output-cache-types';

export function createOutputCache ({
  cache, config, logger
}: {
  cache: OutputCacheStorage | false;
  config: OutputCacheConfig;
  logger: CacheLogger;
}) {
  const enabled = config.server.useOutputCache && !!cache;

  function createRequest (site: string, absoluteUrl: string, cookieHeader?: string): CacheRequest {
    const url = splitPageCacheUrl(new URL(absoluteUrl));
    const abCookie = config.abTesting?.cookieKey;
    const group = abCookie && extractCookieValue(abCookie, cookieHeader);
    return {
      ...url,
      // Encode visitor-controlled group values to keep cache keys distinct.
      key: buildPageCacheKey(site, url.cleanUrl) + (group ? ':' + encodeURIComponent(group) : ''),
      cookieHeader,
      abCookie
    };
  }

  async function read (request: CacheRequest): Promise<CachedResponse | null> {
    if (!enabled || !cache) return null;
    return cache.get(request.key);
  }

  function prepare (request: CacheRequest, input: CacheWriteInput, alreadyClassified: Iterable<string> = []) {
    const reported = new Set(alreadyClassified);
    for (const name of Array.from(new Set(input.cookieReads)).sort()) {
      if (name === request.abCookie) continue;
      input.cacheTags.add('no-cache');
      if (!reported.has(name)) logger.warn('Unregistered SSR cookie dependency:', name);
    }
    if (input.redirect && config.server.useOutputCacheTagging) input.cacheTags.add('redirect');
  }

  async function write (request: CacheRequest, input: CacheWriteInput): Promise<void> {
    prepare(request, input, input.cookieReads);
    // Capture every input before the first asynchronous cache operation and context cleanup.
    // Rendering uses the clean URL, so a redirect Location never carries the request's stripped values.
    if (input.headersSent || !enabled || !cache || input.cacheTags.has('no-cache')) return;
    const tags = config.server.useOutputCacheTagging ? Array.from(input.cacheTags) : [];
    const entry: CachedResponse = {
      kind: 'response',
      headers: { ...input.headers },
      body: input.redirect ? '' : input.body,
      httpCode: input.httpCode,
      redirect: input.redirect ? { ...input.redirect } : null
    };
    await cache.set(request.key, entry, tags);
  }

  return { createRequest, read, prepare, write };
}

export type OutputCache = ReturnType<typeof createOutputCache>;

export function createCacheInvalidationHandler ({ config, cache, apiStatus, beforeInvalidated, afterInvalidated, forwardInvalidation }) {
  return (req, res) => {
    if (config.server.useOutputCache && cache) {
      if (req.query.tag && req.query.key) { // clear cache pages for specific query tag
        if (req.query.key !== config.server.invalidateCacheKey) {
          console.error('Invalid cache invalidation key')
          apiStatus(res, 'Invalid cache invalidation key', 500)
          return
        }
        console.log(`Clear cache request for [${req.query.tag}]`)
        let tags = []
        if (req.query.tag === '*') {
          tags = config.server.availableCacheTags
        } else {
          tags = req.query.tag.split(',')
        }
        const subPromises = []

        beforeInvalidated({ tags, req })

        tags.forEach(tag => {
          if (config.server.availableCacheTags.indexOf(tag) >= 0 || config.server.availableCacheTags.find(t => {
            return tag.indexOf(t) === 0
          })) {
            subPromises.push(cache.invalidate(tag).then(() => {
              console.log(`Tags invalidated successfully for [${tag}]`)
            }))
          } else {
            console.error(`Invalid tag name ${tag}`)
          }
        })

        const completion = Promise.all(subPromises).then(r => {
          apiStatus(res, `Tags invalidated successfully [${req.query.tag}]`, 200)
        }).catch(error => {
          apiStatus(res, error, 500)
          console.error(error)
        }).finally(() => {
          afterInvalidated({ tags, req })
        })

        if (config.server.invalidateCacheForwarding) { // forward invalidate request to the next server in the chain
          if (!req.query.forwardedFrom && config.server.invalidateCacheForwardUrl) { // don't forward forwarded requests
            forwardInvalidation(config.server.invalidateCacheForwardUrl + req.query.tag + '&forwardedFrom=vs')
          }
        }
        return completion
      } else {
        apiStatus(res, 'Invalid parameters for Clear cache request', 500)
        console.error('Invalid parameters for Clear cache request')
      }
    } else {
      apiStatus(res, 'Cache invalidation is not required, output cache is disabled', 200)
    }
  }

}
