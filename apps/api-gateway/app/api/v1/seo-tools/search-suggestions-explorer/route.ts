import {
  createToolPolicy,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  stealthGet,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const searchSuggestionsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 300
});

const ALLOWED_SOURCES = ['google', 'bing', 'youtube'] as const;
type SuggestSource = typeof ALLOWED_SOURCES[number];

type SourceResult = {
  source: SuggestSource;
  suggestions: string[];
  error: string | null;
};

function normalizeSources(rawSources: string[]): SuggestSource[] {
  if (rawSources.length === 0) {
    return [...ALLOWED_SOURCES];
  }

  const normalized = rawSources.map((source) => source.toLowerCase().trim());
  const filtered = normalized.filter((source): source is SuggestSource => ALLOWED_SOURCES.includes(source as SuggestSource));

  if (filtered.length === 0) {
    throw new RequestValidationError('sources must include at least one supported source', {
      supportedSources: ALLOWED_SOURCES
    });
  }

  return Array.from(new Set(filtered));
}

function normalizeKeywordInputs(body: Record<string, unknown>) {
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 20, fieldLabel: 'keywords' });
  const singleKeyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const combined = [
    ...(singleKeyword ? [singleKeyword] : []),
    ...keywords
  ];

  if (combined.length === 0) {
    throw new RequestValidationError('keyword or keywords is required', {
      field: 'keyword',
      alternateField: 'keywords'
    });
  }

  return Array.from(new Set(combined));
}

function normalizeLocale(rawLanguage: unknown, rawCountry: unknown) {
  const language = typeof rawLanguage === 'string' && rawLanguage.trim().length > 0 ? rawLanguage.trim() : 'en';
  const country = typeof rawCountry === 'string' && rawCountry.trim().length > 0 ? rawCountry.trim() : 'US';
  return {
    language,
    country,
    market: `${language}-${country}`
  };
}

async function fetchSuggestions(
  source: SuggestSource,
  keyword: string,
  locale: { language: string; country: string; market: string },
  timeoutMs: number
): Promise<SourceResult> {
  try {
    let url = '';
    if (source === 'google') {
      url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}&hl=${encodeURIComponent(locale.language)}&gl=${encodeURIComponent(locale.country)}`;
    } else if (source === 'youtube') {
      url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(keyword)}&hl=${encodeURIComponent(locale.language)}&gl=${encodeURIComponent(locale.country)}`;
    } else {
      url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(keyword)}&market=${encodeURIComponent(locale.market)}`;
    }

    const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });
    if (!response.body) {
      return { source, suggestions: [], error: 'empty_response' };
    }

    const parsed = JSON.parse(response.body);
    const suggestions = Array.isArray(parsed) && Array.isArray(parsed[1]) ? parsed[1].filter((item) => typeof item === 'string') : [];

    return {
      source,
      suggestions,
      error: null
    };
  } catch (error: any) {
    return {
      source,
      suggestions: [],
      error: error?.message ?? 'request_failed'
    };
  }
}

export const POST = withScrapingHandler({ policy: searchSuggestionsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, searchSuggestionsPolicy);
  const keywords = normalizeKeywordInputs(body);
  const sources = normalizeSources(optionalStringArrayField(body, 'sources', { maxItems: 5, fieldLabel: 'sources' }));
  const limit = optionalIntegerField(body, 'limit', { defaultValue: 10, min: 1, max: 25 });
  const locale = normalizeLocale(body.language, body.country);

  const results = [];

  for (const keyword of keywords) {
    const sourceResults: SourceResult[] = [];

    for (const source of sources) {
      const result = await fetchSuggestions(source, keyword, locale, searchSuggestionsPolicy.timeoutMs);
      sourceResults.push({
        ...result,
        suggestions: result.suggestions.slice(0, limit)
      });
    }

    results.push({
      keyword,
      sources: sourceResults,
      totalSuggestions: sourceResults.reduce((sum, item) => sum + item.suggestions.length, 0)
    });
  }

  return {
    sources,
    locale,
    results
  };
});
