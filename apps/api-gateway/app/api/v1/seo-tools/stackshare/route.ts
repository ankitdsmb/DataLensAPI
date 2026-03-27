import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const stacksharePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: stacksharePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, stacksharePolicy);
  const query = typeof body.query === 'string' ? body.query.trim() : '';

  if (!query) {
    throw new RequestValidationError('query is required', { field: 'query' });
  }

  const searchUrl = `https://stackshare.io/search?q=${encodeURIComponent(query)}`;

  return {
    query,
    searchUrl
  };
});
