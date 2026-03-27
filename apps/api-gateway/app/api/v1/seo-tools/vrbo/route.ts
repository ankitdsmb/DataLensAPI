import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const vrboPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: vrboPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, vrboPolicy);
  const location = typeof body.location === 'string' ? body.location.trim() : '';

  if (!location) {
    throw new RequestValidationError('location is required', { field: 'location' });
  }

  const searchUrl = `https://www.vrbo.com/search/keywords:${encodeURIComponent(location)}`;

  return {
    location,
    searchUrl
  };
});
