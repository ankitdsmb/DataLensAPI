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

const googlePlayKeywordsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: googlePlayKeywordsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, googlePlayKeywordsPolicy);
  requireAllowedFields(body, ['country', 'keyword', 'keywords', 'language', 'limit']);

  const language = optionalStringField(body, 'language', 'en');
  const country = optionalStringField(body, 'country', 'us');
  const results = await discoverKeywordSuggestions('google-play', {
    keywords: normalizeKeywordInputs(body),
    limit: optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 }),
    language,
    country,
    timeoutMs: googlePlayKeywordsPolicy.timeoutMs
  });

  return { locale: { language, country }, results };
});
