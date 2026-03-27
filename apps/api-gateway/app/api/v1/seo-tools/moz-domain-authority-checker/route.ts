import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const mozAuthorityPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: mozAuthorityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, mozAuthorityPolicy);
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';
  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  return {
    domain,
    domainAuthority: null,
    pageAuthority: null
  };
});
