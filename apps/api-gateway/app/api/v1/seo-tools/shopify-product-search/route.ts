import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const shopifyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: shopifyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, shopifyPolicy);
  requireAllowedFields(body, ['query', 'storeUrl']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const storeUrl = typeof body.storeUrl === 'string' ? body.storeUrl.trim() : '';

  if (!query && !storeUrl) {
    throw new RequestValidationError('query or storeUrl is required', {
      field: 'query',
      alternateField: 'storeUrl'
    });
  }

  const baseUrl = storeUrl || 'https://www.shopify.com';
  const searchUrl = query
    ? `${baseUrl.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}`
    : `${baseUrl.replace(/\/$/, '')}/search`;

  return {
    query: query || null,
    storeUrl: storeUrl || null,
    searchUrl
  };
});
