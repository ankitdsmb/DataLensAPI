import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError,
  stealthGet
,
  safeJsonParse} from '@forensic/scraping-core';

const reverseDictionaryPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeQueries(body: Record<string, unknown>) {
  const queries = optionalStringArrayField(body, 'queries', { maxItems: 20, fieldLabel: 'queries' });
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const combined = [
    ...(query ? [query] : []),
    ...queries
  ];

  if (combined.length === 0) {
    throw new RequestValidationError('query or queries is required', {
      field: 'query',
      alternateField: 'queries'
    });
  }

  return Array.from(new Set(combined));
}

export const POST = withScrapingHandler({ policy: reverseDictionaryPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, reverseDictionaryPolicy);
  const queries = normalizeQueries(body);
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit) ? body.limit : 10;

  const results = [];

  for (const query of queries) {
    const response = await stealthGet(`https://api.datamuse.com/words?ml=${encodeURIComponent(query)}&max=${limit}`, {
      timeoutMs: reverseDictionaryPolicy.timeoutMs,
      throwHttpErrors: false
    });
    const data = response.body ? safeJsonParse<Record<string, unknown>>(response.body) : [];
    const words = Array.isArray(data) ? data.map((item: { word?: string }) => item.word).filter(Boolean) : [];
    results.push({ query, words });
  }

  return { results };
});
