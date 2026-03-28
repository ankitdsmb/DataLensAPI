import {
  createToolPolicy,
  discoverKeywordSuggestions,
  normalizeKeywordInputs,
  optionalIntegerField,
  readJsonBody,
  requireAllowedFields,
  withScrapingHandler
} from '@forensic/scraping-core';

const amazonKeywordsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: amazonKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, amazonKeywordsPolicy);
  requireAllowedFields(body, ['keyword', 'keywords', 'limit']);

  const results = await discoverKeywordSuggestions('amazon', {
    keywords: normalizeKeywordInputs(body),
    limit: optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 }),
    timeoutMs: amazonKeywordsPolicy.timeoutMs
  });

  return { results };
});
