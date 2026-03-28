import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
,
  safeJsonParse,
  requireAllowedFields
} from '@forensic/scraping-core';

const dataGovPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: dataGovPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, dataGovPolicy);
  requireAllowedFields(body, ['apiKey', 'query']);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  if (!query) {
    throw new RequestValidationError('query is required', { field: 'query' });
  }
  if (!apiKey) {
    throw new RequestValidationError('apiKey is required', { field: 'apiKey' });
  }

  const url = `https://api.data.gov.in/resource?api-key=${encodeURIComponent(apiKey)}&format=json&filters[title]=${encodeURIComponent(query)}`;
  const response = await stealthGet(url, { timeoutMs: dataGovPolicy.timeoutMs, throwHttpErrors: false });

  return {
    query,
    data: response.body ? safeJsonParse<Record<string, unknown>>(response.body) : null
  };
});
