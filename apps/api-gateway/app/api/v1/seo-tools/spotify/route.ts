import {
  createHelperResponse,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const spotifyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: spotifyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, spotifyPolicy);
  requireAllowedFields(body, ['query']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';

  if (!query) {
    throw new RequestValidationError('query is required', { field: 'query' });
  }

  const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;

  return createHelperResponse({
    status: 'helper_only',
    source: 'spotify_search_url',
    fields: {
      query,
      searchUrl
    },
    contract: {
      productLabel: 'Spotify Search Helper (Lite)',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'public_lite',
      notes:
        'Returns a validated Spotify search URL only. This route does not fetch tracks, artists, albums, playlists, lyrics, or audio streams.'
    }
  });
});
