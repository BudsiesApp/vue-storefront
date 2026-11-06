import { OutgoingHttpHeaders } from 'http';
import { PageCacheUrl } from './page-cache-key';

export interface CachedResponse {
  kind: 'response';
  headers: OutgoingHttpHeaders;
  body: string;
  httpCode: number;
  redirect: { code: 301 | 302; path: string } | null;
}

export type OutputCacheEntry = CachedResponse;

export interface OutputCacheStorage {
  get: (key: string) => Promise<OutputCacheEntry | null>;
  set: (key: string, entry: OutputCacheEntry, tags: string[]) => Promise<void>;
  invalidate: (...tags: string[]) => Promise<void>;
}

export interface OutputCacheConfig {
  server: { useOutputCache: boolean; useOutputCacheTagging: boolean };
  abTesting?: { cookieKey?: string };
}

export interface CacheLogger {
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

export interface CacheRequest extends PageCacheUrl {
  key: string;
  cookieHeader?: string;
  abCookie?: string;
}

export interface CacheWriteInput {
  headersSent: boolean;
  headers: OutgoingHttpHeaders;
  body: string;
  httpCode: number;
  redirect: CachedResponse['redirect'];
  cacheTags: Set<string>;
  cookieReads: Iterable<string>;
}
