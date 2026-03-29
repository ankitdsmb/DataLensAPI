import {
  buildSkyscannerHotelUrl,
  createToolPolicy,
  createTravelSearchHelper,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const skyscannerHotelsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: skyscannerHotelsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, skyscannerHotelsPolicy);
  requireAllowedFields(body, ['location']);
  const location = typeof body.location === 'string' ? body.location.trim() : '';

  if (!location) {
    throw new RequestValidationError('location is required', { field: 'location' });
  }

  return createTravelSearchHelper({
    provider: 'skyscanner',
    vertical: 'hotels',
    location,
    searchUrl: buildSkyscannerHotelUrl(location),
    productLabel: 'Skyscanner Hotels Helper (Lite)',
    notes:
      'Builds a normalized Skyscanner hotels search URL only. This route does not fetch live hotel listings, rates, or availability.'
  });
});
