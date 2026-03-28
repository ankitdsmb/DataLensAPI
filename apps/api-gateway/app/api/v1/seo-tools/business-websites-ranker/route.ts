import {
  createToolPolicy,
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

  const query = [keyword, location].filter(Boolean).join(' ');
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  return {
    keyword,
    location: location || null,
    searchUrl,
    contract: {
      productLabel: 'Business Websites Ranker Seed Query Builder',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'public_lite',
      notes: 'Constructs a Google Maps search seed URL only; ranking extraction and scoring are out of scope for this route.'
    }
  };
});
