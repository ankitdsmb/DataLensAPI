import {
  createHelperResponse,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const softwareAdvicePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: softwareAdvicePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, softwareAdvicePolicy);
  requireAllowedFields(body, ['query']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';

  if (!query) {
    throw new RequestValidationError('query is required', { field: 'query' });
  }

  const searchUrl = `https://www.softwareadvice.com/search/?q=${encodeURIComponent(query)}`;

  return createHelperResponse({
    status: 'helper_only',
    source: 'software_advice_search_url',
    fields: {
      query,
      searchUrl
    },
    contract: {
      productLabel: 'Software Advice Helper (Lite)',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'internal_or_beta_only',
      notes:
        'Builds a normalized Software Advice search URL only. This route does not scrape category rankings, vendor reviews, or product statistics.'
    }
  });
});
