import {
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
,
  safeJsonParse} from '@forensic/scraping-core';

const clearbitCombinedPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: clearbitCombinedPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, clearbitCombinedPolicy);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) {
    throw new RequestValidationError('query is required', { field: 'query' });
  }

  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`;
  const response = await stealthGet(url, { timeoutMs: clearbitCombinedPolicy.timeoutMs, throwHttpErrors: false });
  const data = response.body ? safeJsonParse<Record<string, unknown>>(response.body) : [];

  return {
    query,
    suggestions: data
  };
});
