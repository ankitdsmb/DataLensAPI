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

const youtubeSuggestPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  maxKeywordCount: 12,
  maxBulkItems: 12,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: youtubeSuggestPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, youtubeSuggestPolicy);
  requireAllowedFields(body, ['country', 'keyword', 'keywords', 'language', 'limit']);

  const language = optionalStringField(body, 'language', 'en');
  const country = optionalStringField(body, 'country', 'US');
  const results = await discoverKeywordSuggestions('youtube', {
    keywords: normalizeKeywordInputs(body, youtubeSuggestPolicy),
    limit: optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 }),
    language,
    country,
    timeoutMs: youtubeSuggestPolicy.timeoutMs
  });

  return { locale: { language, country }, results };
});
