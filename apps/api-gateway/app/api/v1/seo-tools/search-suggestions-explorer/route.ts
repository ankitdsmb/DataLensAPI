import {
  createToolPolicy,
  discoverKeywordSuggestions,
  normalizeKeywordInputs,
  optionalIntegerField,
  optionalStringField,
  readJsonBody,
  RequestValidationError,
  requireAllowedFields,
  withScrapingHandler,
  type KeywordDiscoveryProvider
} from '@forensic/scraping-core';

const searchSuggestionsPolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeProvider(body: Record<string, unknown>): KeywordDiscoveryProvider {
  const source = optionalStringField(body, 'source', 'google') as KeywordDiscoveryProvider;
  const supported: KeywordDiscoveryProvider[] = ['google', 'youtube', 'google-play', 'bing', 'amazon', 'app-store'];
  if (!supported.includes(source)) {
    throw new RequestValidationError('source is not supported', { field: 'source', supported });
  }

  return source;
}

export const POST = withScrapingHandler({ policy: searchSuggestionsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, searchSuggestionsPolicy);
  requireAllowedFields(body, ['country', 'keyword', 'keywords', 'language', 'limit', 'market', 'source']);

  const source = normalizeProvider(body);
  const language = optionalStringField(body, 'language', 'en');
  const country = optionalStringField(body, 'country', 'US');
  const market = optionalStringField(body, 'market', 'en-US');

  const results = await discoverKeywordSuggestions(source, {
    keywords: normalizeKeywordInputs(body),
    limit: optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 }),
    language,
    country,
    market,
    timeoutMs: searchSuggestionsPolicy.timeoutMs
  });

  return {
    source,
    locale: { language, country, market },
    results
  };
});
