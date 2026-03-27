import {
  createToolPolicy,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  stealthGet,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const appStoreKeywordsPolicy = createToolPolicy({
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

export const POST = withScrapingHandler({ policy: appStoreKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, appStoreKeywordsPolicy);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });
  const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim() : 'us';

  const results = [];

  for (const keyword of keywords) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=software&country=${encodeURIComponent(country)}`;
    const response = await stealthGet(url, { timeoutMs: appStoreKeywordsPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? JSON.parse(response.body) : {};
    const suggestions = Array.isArray(parsed?.results)
      ? parsed.results.map((item: { trackName?: string }) => item.trackName).filter(Boolean)
      : [];

    results.push({
      keyword,
      suggestions: suggestions.slice(0, limit)
    });
  }

  return { country, results };
});
