import { isCredentialQueryPair, withoutCredentialQuery } from '../../helpers/credential-query';

export function createSsrDiagnostics (req: { url: string; originalUrl?: string }) {
  const original = req.originalUrl || req.url;
  const query = original.split('#')[0].split('?').slice(1).join('?');
  const protectedRequest = query.split('&').some(isCredentialQueryPair);
  const url = protectedRequest ? withoutCredentialQuery(req.url) : req.url;
  return {
    url,
    protectedRequest,
    error: (error: any) => protectedRequest
      ? { type: error instanceof Error ? 'Error' : typeof error, status: typeof error?.code === 'number' ? error.code : undefined }
      : error,
    request: protectedRequest ? { url, originalUrl: withoutCredentialQuery(original) } : req
  };
}
