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
  safeJsonParse,
  requireAllowedFields,
  optionalStringField} from '@forensic/scraping-core';

const googlePlayKeywordsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});



export const POST = withScrapingHandler({ policy: googlePlayKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, googlePlayKeywordsPolicy);
  requireAllowedFields(body, ['keyword', 'keywords', 'limit', 'language', 'country']);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });
  const language = optionalStringField(body, 'language', 'en');
  const country = optionalStringField(body, 'country', 'us');

  const results = [];

  for (const keyword of keywords) {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=play&q=${encodeURIComponent(keyword)}&hl=${encodeURIComponent(language)}&gl=${encodeURIComponent(country)}`;
    const response = await stealthGet(url, { timeoutMs: googlePlayKeywordsPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? safeJsonParse<unknown[]>(response.body) : [];
    const suggestions = Array.isArray(parsed) && Array.isArray((parsed as unknown[])[1]) ? (parsed as unknown[])[1] : [];

    results.push({
      keyword,
      suggestions: (suggestions as unknown[]).filter((item) => typeof item === 'string').slice(0, limit)
    });
  }

  return { locale: { language, country }, results };
});
