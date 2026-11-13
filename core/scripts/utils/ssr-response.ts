import { Request, Response } from 'express';
import { Context } from './types';
import { CacheLogger, CacheRequest, CacheWriteInput, CachedResponse } from './output-cache-types';
import { OutputCache } from './output-cache';
import { appendStrippedQuery } from './page-cache-key';
import { createSsrDiagnostics } from './ssr-diagnostics';

export function createSsrErrorHandler ({
  res, req, logger, isResourceNotFound, apiStatus, onException
}: {
  res: Response;
  req: Request;
  logger: CacheLogger;
  isResourceNotFound: () => boolean;
  apiStatus: (res: Response, message: string, code: number) => any;
  onException: (err: any) => void;
}) {
  const diagnostic = createSsrDiagnostics(req);
  return (err: any) => {
    if (res.headersSent) {
      logger.error('SSR error after response sent:', diagnostic.url, diagnostic.error(err));
      return;
    }
    if (err?.code === 404) {
      if (isResourceNotFound()) {
        logger.error('Resource is not found:', diagnostic.url);
        return apiStatus(res, 'Vue Storefront: Resource is not found', 404);
      }
      logger.error('Redirect for resource not found:', diagnostic.url);
      return res.redirect('/page-not-found');
    }
    logger.error('Error during render:', diagnostic.url, diagnostic.error(err));
    onException(err);
    return res.redirect('/error');
  };
}

export function createRenderResponseHandler ({
  res, req, context, outputCache, cacheRequest, tagging, logger,
  beforeOutput, afterOutput, processOutput, onComplete
}: {
  res: Response;
  req: Request;
  context: Context;
  outputCache: OutputCache;
  cacheRequest: CacheRequest;
  tagging: boolean;
  logger: CacheLogger;
  beforeOutput: (output: string) => any;
  afterOutput: (output: string) => any;
  processOutput: (output: string) => string;
  onComplete: () => void;
}) {
  const diagnostic = createSsrDiagnostics(req);
  return (output: string) => {
    if (res.headersSent) {
      logger.warn(diagnostic.url, 'response already sent by application code');
      return;
    }
    if (!res.get('content-type')) res.setHeader('Content-Type', 'text/html');
    const renderCookieReads = Array.from(context.output.cookieReads);
    const input: CacheWriteInput = {
      headersSent: res.headersSent,
      headers: {},
      body: '',
      httpCode: res.statusCode,
      redirect: context.output.redirect,
      cacheTags: context.output.cacheTags,
      cookieReads: renderCookieReads
    };
    outputCache.prepare(cacheRequest, input);
    const setCacheTagsHeader = () => {
      if (tagging && input.cacheTags.size) {
        res.setHeader('X-VS-Cache-Tags', Array.from(input.cacheTags).join(' '));
      }
    };
    setCacheTagsHeader();
    const before = beforeOutput(output);
    if (typeof before === 'string') output = before;
    else if (typeof before?.output === 'string') output = before.output;
    output = processOutput(output);
    // Output hooks and template processing can read cookies too; classify the complete read set.
    const cookieReads = Array.from(context.output.cookieReads);
    if (cookieReads.length !== renderCookieReads.length) {
      outputCache.prepare(cacheRequest, { ...input, cookieReads }, renderCookieReads);
      setCacheTagsHeader();
    }
    outputCache.write(cacheRequest, {
      ...input,
      cookieReads,
      headersSent: res.headersSent,
      headers: res.getHeaders(),
      body: output,
      httpCode: res.statusCode,
      redirect: context.output.redirect
    }).catch(error => logger.error('Output cache write failed:', diagnostic.url, diagnostic.error(error)));

    const after = afterOutput(output);
    if (context.output.redirect) {
      const { code, path } = context.output.redirect;
      return res.redirect(code, appendStrippedQuery(path, cacheRequest.strippedQuery));
    }
    res.end(typeof after === 'string' ? after : typeof after?.output === 'string' ? after.output : output);
    onComplete();
  };
}

// Both process boundaries terminate normally even if their error callback or cleanup fails.
export function renderSsrResponse ({ render, renderHandler, errorHandler, cleanup, logFinalFailure }: {
  render: () => string | Promise<string>;
  renderHandler: (output: string) => any;
  errorHandler: (error: any) => any;
  cleanup: () => void;
  logFinalFailure: (error: any) => void;
}) {
  return Promise.resolve().then(render).then(renderHandler).catch(errorHandler)
    .finally(cleanup).catch(logFinalFailure);
}

export function lookupSsrResponse ({ read, cacheRequest, onMiss, res, onHit, errorHandler, logFinalFailure, logCache = () => {} }: {
  logCache?: (result: 'hit' | 'redirect' | 'miss') => void;
  read: () => Promise<CachedResponse | null>;
  cacheRequest: CacheRequest;
  onMiss: () => any;
  res: Response;
  onHit: () => void;
  errorHandler: (error: any) => any;
  logFinalFailure: (error: any) => void;
}) {
  return Promise.resolve().then(read).then(output => {
    if (!output) {
      res.setHeader('X-VS-Cache', 'Miss');
      logCache('miss');
      return onMiss();
    }
    for (const header of Object.keys(output.headers)) {
      res.setHeader(header, output.headers[header]);
    }
    res.setHeader('X-VS-Cache', 'Hit');
    res.status(output.httpCode);
    if (output.redirect) {
      res.redirect(output.redirect.code, appendStrippedQuery(output.redirect.path, cacheRequest.strippedQuery));
      logCache('redirect');
      return;
    }
    res.end(output.body);
    logCache('hit');
    onHit();
  }).catch(errorHandler).catch(logFinalFailure);
}
