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

const bingKeywordsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});



export const POST = withScrapingHandler({ policy: bingKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, bingKeywordsPolicy);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });
  const market = typeof body.market === 'string' && body.market.trim() ? body.market.trim() : 'en-US';

  const results = [];

  for (const keyword of keywords) {
    const url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(keyword)}&market=${encodeURIComponent(market)}`;
    const response = await stealthGet(url, { timeoutMs: bingKeywordsPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? safeJsonParse<unknown[]>(response.body) : [];
    const suggestions = Array.isArray(parsed) && Array.isArray((parsed as unknown[])[1]) ? (parsed as unknown[])[1] : [];

    results.push({
      keyword,
      suggestions: (suggestions as unknown[]).filter((item) => typeof item === 'string').slice(0, limit)
    });
  }

  return {
    market,
    results
  };
});
