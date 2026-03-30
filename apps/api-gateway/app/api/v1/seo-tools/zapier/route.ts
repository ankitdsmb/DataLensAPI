import {
  createToolPolicy,
  fetchZapierAppIntegrations,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const zapierPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: zapierPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, zapierPolicy);
  requireAllowedFields(body, ['query', 'limit']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const limitValue = typeof body.limit === 'number' ? body.limit : Number(body.limit);
  const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(8, Math.trunc(limitValue))) : 5;

  if (!query) {
    throw new RequestValidationError('query is required', { field: 'query' });
  }

  const searchUrl = `https://zapier.com/apps/search?q=${encodeURIComponent(query)}`;

  try {
    const liveApp = await fetchZapierAppIntegrations({
      query,
      limit,
      timeoutMs: Math.min(zapierPolicy.timeoutMs, 6000)
    });

    return {
      ...liveApp,
      contract: {
        productLabel: 'Zapier App Integrations',
        forensicCategory: 'html-scraper',
        implementationDepth: 'live',
        launchRecommendation: 'public_lite',
        notes:
          'Fetches the public Zapier app integrations page for a resolvable app slug and extracts app metadata plus visible integration-card evidence. It does not authenticate against private Zapier APIs or execute workflows.'
      }
    };
  } catch {
    return {
      query,
      searchUrl,
      status: 'helper_fallback',
      source: 'zapier_search_url',
      evidence: {
        pageFetched: false,
        metadataParsed: false,
        jsonLdParsed: false,
        integrationCardsParsed: false
      },
      contract: {
        productLabel: 'Zapier App Integrations',
        forensicCategory: 'html-scraper',
        implementationDepth: 'partial',
        launchRecommendation: 'public_lite',
        notes:
          'Attempts direct Zapier app-integrations evidence extraction for resolvable app slugs and falls back to a search helper when the exact public app page cannot be resolved.'
      }
    };
  }
});
