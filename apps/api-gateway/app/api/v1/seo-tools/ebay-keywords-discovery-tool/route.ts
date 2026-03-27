import {
  createToolPolicy,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  stealthGet,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const ebayKeywordsPolicy = createToolPolicy({
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

export const POST = withScrapingHandler({ policy: ebayKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, ebayKeywordsPolicy);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });

  const results = [];

  for (const keyword of keywords) {
    const url = `https://autosug.ebay.com/autosug?kwd=${encodeURIComponent(keyword)}&_dg=1`;
    const response = await stealthGet(url, { timeoutMs: ebayKeywordsPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? JSON.parse(response.body) : {};
    const suggestions = Array.isArray(parsed?.res?.sug)
      ? parsed.res.sug.map((item: { kwd?: string }) => item.kwd).filter(Boolean)
      : [];

    results.push({
      keyword,
      suggestions: suggestions.slice(0, limit)
    });
  }

  return { results };
});
