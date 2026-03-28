import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  requireAllowedFields
} from '@forensic/scraping-core';

const carHirePolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: carHirePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, carHirePolicy);
  requireAllowedFields(body, ['location']);
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  if (!location) {
    throw new RequestValidationError('location is required', { field: 'location' });
  }

  return {
    location,
    searchUrl: `https://www.skyscanner.com/carhire/search?pickup=${encodeURIComponent(location)}`
  };
});
