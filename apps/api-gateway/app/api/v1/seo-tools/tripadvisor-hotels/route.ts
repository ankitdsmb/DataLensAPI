import {
  buildTripadvisorHotelsUrl,
  createToolPolicy,
  createTravelSearchHelper,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const tripadvisorHotelsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: tripadvisorHotelsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, tripadvisorHotelsPolicy);
  requireAllowedFields(body, ['location']);
  const location = typeof body.location === 'string' ? body.location.trim() : '';

  if (!location) {
    throw new RequestValidationError('location is required', { field: 'location' });
  }

  return createTravelSearchHelper({
    provider: 'tripadvisor',
    vertical: 'hotels',
    location,
    searchUrl: buildTripadvisorHotelsUrl(location),
    productLabel: 'Tripadvisor Hotels Helper (Lite)',
    notes:
      'Builds a normalized Tripadvisor hotels search URL only. This route does not scrape live hotel inventory or challenge-gated Tripadvisor pages.'
  });
});
