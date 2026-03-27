import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const openTablePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: openTablePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, openTablePolicy);
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const term = query || location;

  if (!term) {
    throw new RequestValidationError('location or query is required', {
      field: 'location',
      alternateField: 'query'
    });
  }

  const searchUrl = `https://www.opentable.com/s?term=${encodeURIComponent(term)}`;

  return {
    term,
    searchUrl
  };
});
