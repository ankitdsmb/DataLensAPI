import { stealthGet } from '../httpClient';
import { safeJsonParse } from '../validation';

export type KeywordDiscoveryProvider = 'google' | 'youtube' | 'google-play' | 'bing' | 'amazon' | 'app-store';

export type KeywordDiscoveryInput = {
  keywords: string[];
  limit: number;
  timeoutMs: number;
  language?: string;
  country?: string;
  market?: string;
};

export type KeywordSuggestionResult = {
  keyword: string;
  suggestions: string[];
};

function normalizeStringList(values: unknown[]): string[] {
  return values.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean);
}

async function fetchJson(url: string, timeoutMs: number) {
  const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });
  return safeJsonParse<unknown>(response.body, null);
}

async function fetchGoogleStyleSuggestions(url: string, timeoutMs: number, limit: number): Promise<string[]> {
  const payload = await fetchJson(url, timeoutMs);
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) {
    return [];
  }

  return normalizeStringList(payload[1]).slice(0, limit);
}

async function fetchAppStoreSuggestions(url: string, timeoutMs: number, limit: number): Promise<string[]> {
  const payload = (await fetchJson(url, timeoutMs)) as { results?: Array<{ trackName?: unknown }> } | null;
  const names = payload?.results?.map((item) => (typeof item.trackName === 'string' ? item.trackName : '')).filter(Boolean) ?? [];
  return names.slice(0, limit);
}

async function fetchAmazonSuggestions(url: string, timeoutMs: number, limit: number): Promise<string[]> {
  const payload = (await fetchJson(url, timeoutMs)) as { suggestions?: Array<{ value?: unknown }> } | null;
  const values = payload?.suggestions?.map((item) => (typeof item.value === 'string' ? item.value : '')).filter(Boolean) ?? [];
  return values.slice(0, limit);
}

function buildProviderUrl(provider: KeywordDiscoveryProvider, keyword: string, input: KeywordDiscoveryInput): string {
  const encodedKeyword = encodeURIComponent(keyword);

  switch (provider) {
    case 'google':
      return `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodedKeyword}&hl=${encodeURIComponent(input.language ?? 'en')}&gl=${encodeURIComponent(input.country ?? 'US')}`;
    case 'youtube':
      return `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodedKeyword}&hl=${encodeURIComponent(input.language ?? 'en')}&gl=${encodeURIComponent(input.country ?? 'US')}`;
    case 'google-play':
      return `https://suggestqueries.google.com/complete/search?client=firefox&ds=play&q=${encodedKeyword}&hl=${encodeURIComponent(input.language ?? 'en')}&gl=${encodeURIComponent(input.country ?? 'us')}`;
    case 'bing':
      return `https://api.bing.com/osjson.aspx?query=${encodedKeyword}&market=${encodeURIComponent(input.market ?? 'en-US')}`;
    case 'amazon':
      return `https://completion.amazon.com/api/2017/suggestions?limit=${input.limit}&prefix=${encodedKeyword}&alias=aps`;
    case 'app-store':
      return `https://itunes.apple.com/search?term=${encodedKeyword}&entity=software&country=${encodeURIComponent(input.country ?? 'us')}`;
    default:
      return '';
  }
}

export async function discoverKeywordSuggestions(
  provider: KeywordDiscoveryProvider,
  input: KeywordDiscoveryInput
): Promise<KeywordSuggestionResult[]> {
  const results: KeywordSuggestionResult[] = [];

  for (const keyword of input.keywords) {
    const url = buildProviderUrl(provider, keyword, input);
    let suggestions: string[] = [];

    if (provider === 'app-store') {
      suggestions = await fetchAppStoreSuggestions(url, input.timeoutMs, input.limit);
    } else if (provider === 'amazon') {
      suggestions = await fetchAmazonSuggestions(url, input.timeoutMs, input.limit);
    } else {
      suggestions = await fetchGoogleStyleSuggestions(url, input.timeoutMs, input.limit);
    }

    results.push({ keyword, suggestions });
  }

  return results;
}
