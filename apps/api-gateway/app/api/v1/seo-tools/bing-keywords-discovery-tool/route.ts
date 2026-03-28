import {
  createToolPolicy,
  discoverKeywordSuggestions,
  normalizeKeywordInputs,
  optionalIntegerField,
  optionalStringField,
  readJsonBody,
  requireAllowedFields,
  withScrapingHandler
} from '@forensic/scraping-core';

const bingKeywordsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: bingKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, bingKeywordsPolicy);
  requireAllowedFields(body, ['keyword', 'keywords', 'limit', 'market']);

  const market = optionalStringField(body, 'market', 'en-US');
  const results = await discoverKeywordSuggestions('bing', {
    keywords: normalizeKeywordInputs(body),
    limit: optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 }),
    market,
    timeoutMs: bingKeywordsPolicy.timeoutMs
  });

  return { market, results };
});
