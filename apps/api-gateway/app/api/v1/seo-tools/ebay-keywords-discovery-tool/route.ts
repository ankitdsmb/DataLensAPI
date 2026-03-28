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

const ebayKeywordsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});



export const POST = withScrapingHandler({ policy: ebayKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, ebayKeywordsPolicy);
  const keywords = normalizeKeywordInputs(body);
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });

  const results = [];

  for (const keyword of keywords) {
    const url = `https://autosug.ebay.com/autosug?kwd=${encodeURIComponent(keyword)}&_dg=1`;
    const response = await stealthGet(url, { timeoutMs: ebayKeywordsPolicy.timeoutMs, throwHttpErrors: false });
    const parsed = response.body ? safeJsonParse<Record<string, unknown>>(response.body) : {};
    const sugArray = ((parsed as Record<string, unknown>)?.res as Record<string, unknown>)?.sug as Array<Record<string, unknown>>;
    const suggestions = Array.isArray(sugArray)
      ? sugArray.map((item: unknown) => (item as { kwd?: string }).kwd).filter(Boolean)
      : [];

    results.push({
      keyword,
      suggestions: suggestions.slice(0, limit)
    });
  }

  return { results };
});
