import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  requireAllowedFields
} from '@forensic/scraping-core';

const mozSpamPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: mozSpamPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, mozSpamPolicy);
  requireAllowedFields(body, ['domain']);
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';
  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  return {
    domain,
    da: null,
    pa: null,
    spamScore: null
  };
});
