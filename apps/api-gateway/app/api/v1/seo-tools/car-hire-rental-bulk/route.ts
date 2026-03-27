import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const carHireBulkPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 25,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: carHireBulkPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, carHireBulkPolicy);
  const locations = optionalStringArrayField(body, 'locations', { maxItems: 25, fieldLabel: 'locations' });
  if (locations.length === 0) {
    throw new RequestValidationError('locations is required', { field: 'locations' });
  }

  const results = locations.map((location) => ({
    location,
    searchUrl: `https://www.skyscanner.com/carhire/search?pickup=${encodeURIComponent(location)}`
  }));

  return { results };
});
