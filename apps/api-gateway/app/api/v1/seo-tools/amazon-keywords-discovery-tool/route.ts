import {
  createToolPolicy,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  stealthGet,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const amazonKeywordsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeKeywordInputs(body: Record<string, unknown>) {
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 20, fieldLabel: 'keywords' });
  const singleKeyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const combined = [
    ...(singleKeyword ? [singleKeyword] : []),
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

export const POST = withScrapingHandler({ policy: amazonKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, amazonKeywordsPolicy);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });

  const results = [];

  for (const keyword of keywords) {
    const url = `https://completion.amazon.com/api/2017/suggestions?limit=${limit}&prefix=${encodeURIComponent(keyword)}&alias=aps`;
    const response = await stealthGet(url, { timeoutMs: amazonKeywordsPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? JSON.parse(response.body) : {};
    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.map((item: { value?: string }) => item.value).filter(Boolean)
      : [];

    results.push({
      keyword,
      suggestions: suggestions.slice(0, limit)
    });
  }

  return { results };
});
