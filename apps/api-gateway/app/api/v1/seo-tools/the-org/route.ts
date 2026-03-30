import {
  createHelperResponse,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const theOrgPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: theOrgPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, theOrgPolicy);
  requireAllowedFields(body, ['query']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';

  if (!query) {
    throw new RequestValidationError('query is required', { field: 'query' });
  }

  const searchUrl = `https://theorg.com/search?query=${encodeURIComponent(query)}`;

  return createHelperResponse({
    status: 'helper_only',
    source: 'the_org_search_url',
    fields: {
      query,
      searchUrl
    },
    contract: {
      productLabel: 'The Org Helper (Lite)',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'internal_or_beta_only',
      notes:
        'Builds a normalized The Org search URL only. This route does not scrape org charts, hiring data, or team structures.'
    }
  });
});
