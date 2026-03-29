import {
  createToolPolicy,
  searchOpenTableRestaurants,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const openTablePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: openTablePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, openTablePolicy);
  requireAllowedFields(body, ['location', 'query', 'limit']);
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const limitValue = typeof body.limit === 'number' ? body.limit : Number(body.limit);
  const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(10, Math.trunc(limitValue))) : 5;
  const term = [query, location].filter(Boolean).join(' ').trim();

  if (!term) {
    throw new RequestValidationError('location or query is required', {
      field: 'location',
      alternateField: 'query'
    });
  }

  const liveSearch = await searchOpenTableRestaurants({
    term,
    limit,
    timeoutMs: Math.min(openTablePolicy.timeoutMs, 6000)
  });

  return {
    ...liveSearch,
    location: location || null,
    query: query || null,
    contract: {
      productLabel: 'OpenTable Search',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Fetches the public OpenTable search page and parses embedded search-state restaurant data such as names, profile URLs, cuisine, neighborhood, ratings, and reservation signals. It does not access private booking APIs.'
    }
  };
});
