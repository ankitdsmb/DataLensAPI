import {
  createHelperResponse,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const spotifyPlusPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: spotifyPlusPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, spotifyPlusPolicy);
  requireAllowedFields(body, ['query']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';

  if (!query) {
    throw new RequestValidationError('query is required', { field: 'query' });
  }

  const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;

  return createHelperResponse({
    status: 'compatibility_wrapper',
    source: 'spotify_search_url',
    fields: {
      query,
      searchUrl,
      tier: 'plus',
      compatibilityTarget: '/api/v1/seo-tools/spotify'
    },
    contract: {
      productLabel: 'Spotify Plus Helper (Compatibility)',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'public_lite',
      notes:
        'Compatibility wrapper over the base Spotify helper route. It returns the same normalized Spotify search URL and does not add any live Spotify extraction.'
    }
  });
});
