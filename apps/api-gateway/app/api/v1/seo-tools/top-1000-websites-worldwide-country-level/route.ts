import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const topSitesPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: topSitesPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, topSitesPolicy);
  requireAllowedFields(body, ['country']);
  const country = typeof body.country === 'string' ? body.country.trim() : '';

  return {
    country: country || null,
    status: 'queued'
  };
});
