import {
  createToolPolicy,
  rankBusinessWebsites,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const businessRankerPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: businessRankerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, businessRankerPolicy);
  requireAllowedFields(body, ['keyword', 'location']);
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';

  if (!keyword) {
    throw new RequestValidationError('keyword is required', { field: 'keyword' });
  }

  const ranking = await rankBusinessWebsites({
    keyword,
    location: location || null,
    timeoutMs: Math.min(businessRankerPolicy.timeoutMs, 5000)
  });

  return {
    keyword,
    location: location || null,
    query: ranking.query,
    searchUrl: ranking.searchUrl,
    source: ranking.source,
    candidateCount: ranking.candidateCount,
    analyzedCount: ranking.analyzedCount,
    underperformingCount: ranking.underperformingCount,
    rankedBusinesses: ranking.rankedBusinesses,
    contract: {
      productLabel: 'Business Websites Ranker',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Discovers public business websites from DuckDuckGo HTML search results and applies lightweight website-quality scoring. This is not an authoritative Google Places ranking feed.'
    }
  };
});
