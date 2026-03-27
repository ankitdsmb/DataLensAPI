import {
  createToolPolicy,
  optionalStringArrayField,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
} from '@forensic/scraping-core';

const seobilityKeywordPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeKeywords(body: Record<string, unknown>) {
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 25, fieldLabel: 'keywords' });
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const combined = [
    ...(keyword ? [keyword] : []),
    ...keywords
  ];

  if (combined.length === 0) {
    throw new RequestValidationError('keyword or keywords is required', {
      field: 'keyword',
      alternateField: 'keywords'
    });
  }

  return Array.from(new Set(combined));
}

export const POST = withScrapingHandler({ policy: seobilityKeywordPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, seobilityKeywordPolicy);
  const keywords = normalizeKeywords(body);

  const results = keywords.map((term) => ({
    keyword: term,
    status: 'queued'
  }));

  return { results };
});
