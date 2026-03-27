import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
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
  const location = typeof body.location === 'string' ? body.location.trim() : '';

  if (!location) {
    throw new RequestValidationError('location is required', { field: 'location' });
  }

  const searchUrl = `https://www.skyscanner.com/hotels/search?query=${encodeURIComponent(location)}`;

  return {
    location,
    searchUrl
  };
});
