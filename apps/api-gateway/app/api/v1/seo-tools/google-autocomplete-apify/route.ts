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

const googleAutocompletePolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: googleAutocompletePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, googleAutocompletePolicy);
  requireAllowedFields(body, ['country', 'keyword', 'keywords', 'language', 'limit']);

  const language = optionalStringField(body, 'language', 'en');
  const country = optionalStringField(body, 'country', 'US');
  const results = await discoverKeywordSuggestions('google', {
    keywords: normalizeKeywordInputs(body),
    limit: optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 }),
    language,
    country,
    timeoutMs: googleAutocompletePolicy.timeoutMs
  });

  return { locale: { language, country }, results };
});
