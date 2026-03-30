import {
  buildSkyscannerCarHireUrl,
  createToolPolicy,
  createTravelSearchHelper,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const skyscannerCarsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: skyscannerCarsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, skyscannerCarsPolicy);
  requireAllowedFields(body, ['location']);
  const location = typeof body.location === 'string' ? body.location.trim() : '';

  if (!location) {
    throw new RequestValidationError('location is required', { field: 'location' });
  }

  return createTravelSearchHelper({
    provider: 'skyscanner',
    vertical: 'car_hire',
    location,
    searchUrl: buildSkyscannerCarHireUrl(location),
    productLabel: 'Skyscanner Cars Helper (Lite)',
    notes:
      'Compatibility wrapper over the travel-search helper family. Returns a normalized Skyscanner car-hire search URL only.'
  });
});
