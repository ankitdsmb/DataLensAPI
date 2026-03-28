import {
  createToolPolicy,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  stealthGet,
  withScrapingHandler,
  RequestValidationError
,
  normalizeKeywordInputs,
  safeJsonParse} from '@forensic/scraping-core';

const youtubeKeywordsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});



export const POST = withScrapingHandler({ policy: youtubeKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, youtubeKeywordsPolicy);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });
  const language = typeof body.language === 'string' && body.language.trim() ? body.language.trim() : 'en';
  const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim() : 'US';

  const results = [];

  for (const keyword of keywords) {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(keyword)}&hl=${encodeURIComponent(language)}&gl=${encodeURIComponent(country)}`;
    const response = await stealthGet(url, { timeoutMs: youtubeKeywordsPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? safeJsonParse<unknown[]>(response.body) : [];
    const suggestions = Array.isArray(parsed) && Array.isArray((parsed as unknown[])[1]) ? (parsed as unknown[])[1] : [];

    results.push({
      keyword,
      suggestions: (suggestions as unknown[]).filter((item) => typeof item === 'string').slice(0, limit)
    });
  }

  return { locale: { language, country }, results };
});
