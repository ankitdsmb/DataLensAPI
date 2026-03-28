import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler
, enqueueJob
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
  const country = typeof body.country === 'string' ? body.country.trim() : '';

  return { job: enqueueJob('top-1000-websites-worldwide-country-level', { country: country || null }) };
});
