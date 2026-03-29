import {
  createToolPolicy,
  fetchTrancoGlobalPopularity,
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
  requireAllowedFields(body, ['country', 'limit']);
  const country = typeof body.country === 'string' ? body.country.trim() : '';
  const limitValue = typeof body.limit === 'number' ? body.limit : Number(body.limit);
  const limit = Number.isFinite(limitValue) ? limitValue : 100;

  const snapshot = await fetchTrancoGlobalPopularity({
    limit,
    country: country || null,
    timeoutMs: Math.min(topSitesPolicy.timeoutMs, 6000)
  });

  return {
    ...snapshot,
    contract: {
      productLabel: 'Top Websites Popularity Snapshot (Global Lite)',
      forensicCategory: 'public-api-wrapper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Uses the public Tranco latest-list API to return a capped global popularity snapshot. The legacy country parameter is accepted for compatibility but country-level ranking is not implemented in this route.'
    }
  };
});
