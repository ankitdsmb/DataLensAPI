import {
  createToolPolicy,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  stealthGet,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const youtubeMusicPolicy = createToolPolicy({
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

export const POST = withScrapingHandler({ policy: youtubeMusicPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, youtubeMusicPolicy);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });
  const language = typeof body.language === 'string' && body.language.trim() ? body.language.trim() : 'en';
  const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim() : 'US';

  const results = [];

  for (const keyword of keywords) {
    const query = `${keyword} music`;
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}&hl=${encodeURIComponent(language)}&gl=${encodeURIComponent(country)}`;
    const response = await stealthGet(url, { timeoutMs: youtubeMusicPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? JSON.parse(response.body) : [];
    const suggestions = Array.isArray(parsed) && Array.isArray(parsed[1]) ? parsed[1] : [];

    results.push({
      keyword,
      suggestions: suggestions.filter((item) => typeof item === 'string').slice(0, limit)
    });
  }

  return { locale: { language, country }, results };
});
