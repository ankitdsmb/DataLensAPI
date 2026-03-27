import {
  createToolPolicy,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  stealthGet,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const bingKeywordsPolicy = createToolPolicy({
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

export const POST = withScrapingHandler({ policy: bingKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, bingKeywordsPolicy);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });
  const market = typeof body.market === 'string' && body.market.trim() ? body.market.trim() : 'en-US';

  const results = [];

  for (const keyword of keywords) {
    const url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(keyword)}&market=${encodeURIComponent(market)}`;
    const response = await stealthGet(url, { timeoutMs: bingKeywordsPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? JSON.parse(response.body) : [];
    const suggestions = Array.isArray(parsed) && Array.isArray(parsed[1]) ? parsed[1] : [];

    results.push({
      keyword,
      suggestions: suggestions.filter((item) => typeof item === 'string').slice(0, limit)
    });
  }

  return {
    market,
    results
  };
});
