import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const spyfuPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: spyfuPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, spyfuPolicy);
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';

  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  const reportUrl = `https://www.spyfu.com/overview/domain?query=${encodeURIComponent(domain)}`;

  return {
    domain,
    reportUrl
  };
});
