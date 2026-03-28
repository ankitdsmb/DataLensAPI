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

const appStoreSuggestPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  maxKeywordCount: 12,
  maxBulkItems: 12,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: appStoreSuggestPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, appStoreSuggestPolicy);
  requireAllowedFields(body, ['country', 'keyword', 'keywords', 'limit']);

  const country = optionalStringField(body, 'country', 'us');
  const results = await discoverKeywordSuggestions('app-store', {
    keywords: normalizeKeywordInputs(body, appStoreSuggestPolicy),
    limit: optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 }),
    country,
    timeoutMs: appStoreSuggestPolicy.timeoutMs
  });

  return { country, results };
});
