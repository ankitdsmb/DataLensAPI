import {
  createHelperResponse,
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const showtimesPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: showtimesPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, showtimesPolicy);
  requireAllowedFields(body, ['location', 'movie']);
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const movie = typeof body.movie === 'string' ? body.movie.trim() : '';

  if (!location && !movie) {
    throw new RequestValidationError('location or movie is required', {
      field: 'location',
      alternateField: 'movie'
    });
  }

  const query = [movie, 'showtimes', location].filter(Boolean).join(' ');
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  return createHelperResponse({
    status: 'helper_only',
    source: 'google_showtimes_search',
    fields: {
      location: location || null,
      movie: movie || null,
      query,
      searchUrl
    },
    contract: {
      productLabel: 'Showtimes Helper (Lite)',
      forensicCategory: 'shallow-local-utility',
      implementationDepth: 'helper',
      launchRecommendation: 'public_lite',
      notes:
        'Builds a normalized showtimes search query only. This route does not fetch cinema schedules or parse theater-specific showtime listings.'
    }
  });
});
