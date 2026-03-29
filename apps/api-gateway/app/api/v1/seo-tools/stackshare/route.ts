import {
  createHelperResponse,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const stacksharePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: stacksharePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, stacksharePolicy);
  requireAllowedFields(body, ['query']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';

  if (!query) {
    throw new RequestValidationError('query is required', { field: 'query' });
  }

  const searchUrl = `https://stackshare.io/search?q=${encodeURIComponent(query)}`;

  return createHelperResponse({
    status: 'helper_only',
    source: 'stackshare_search_url',
    fields: {
      query,
      searchUrl
    },
    contract: {
      productLabel: 'StackShare Helper (Lite)',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'internal_or_beta_only',
      notes:
        'Builds a normalized StackShare search URL only. This route does not scrape stack comparisons, votes, or product metadata.'
    }
  });
});
