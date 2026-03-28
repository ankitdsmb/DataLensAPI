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

const appStoreKeywordsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});



export const POST = withScrapingHandler({ policy: appStoreKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, appStoreKeywordsPolicy);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });
  const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim() : 'us';

  const results = [];

  for (const keyword of keywords) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=software&country=${encodeURIComponent(country)}`;
    const response = await stealthGet(url, { timeoutMs: appStoreKeywordsPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? safeJsonParse<Record<string, unknown>>(response.body) : {};
    const suggestions = Array.isArray(((parsed as Record<string, unknown>)?.results as Array<Record<string, unknown>>))
      ? ((parsed as Record<string, unknown>)?.results as Array<Record<string, unknown>>).map((item: { trackName?: string }) => item.trackName).filter(Boolean)
      : [];

    results.push({
      keyword,
      suggestions: suggestions.slice(0, limit)
    });
  }

  return { country, results };
});
