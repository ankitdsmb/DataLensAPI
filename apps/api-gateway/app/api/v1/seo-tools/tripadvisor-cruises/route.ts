import {
  buildTripadvisorCruisesUrl,
  createToolPolicy,
  createTravelSearchHelper,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const tripadvisorCruisesPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: tripadvisorCruisesPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, tripadvisorCruisesPolicy);
  requireAllowedFields(body, ['location']);
  const location = typeof body.location === 'string' ? body.location.trim() : '';

  if (!location) {
    throw new RequestValidationError('location is required', { field: 'location' });
  }

  return createTravelSearchHelper({
    provider: 'tripadvisor',
    vertical: 'cruises',
    location,
    searchUrl: buildTripadvisorCruisesUrl(location),
    productLabel: 'Tripadvisor Cruises Helper (Lite)',
    notes:
      'Builds a normalized Tripadvisor cruises search URL only. This route does not scrape cruise listings or challenge-gated Tripadvisor results.'
  });
});
