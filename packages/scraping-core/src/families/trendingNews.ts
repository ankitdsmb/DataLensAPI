import * as cheerio from 'cheerio';
import { stealthGet } from '../httpClient';

export type TrendingNewsInput = {
  keyword: string;
  limit: number;
  timeoutMs: number;
  language?: string;
  country?: string;
};

export type TrendingNewsArticle = {
  title: string;
  googleNewsUrl: string;
  source: string | null;
  sourceUrl: string | null;
  summary: string | null;
  publishedAt: string | null;
  guid: string | null;
};

export type TrendingNewsFeedResult = {
  keyword: string;
  feedTitle: string | null;
  searchUrl: string;
  feedUrl: string;
  language: string;
  country: string;
  articleCount: number;
  articles: TrendingNewsArticle[];
  lastBuildDate: string | null;
  evidence: {
    feedFetched: boolean;
    itemsParsed: boolean;
    sourceMetadataParsed: boolean;
  };
};

function normalizeLanguage(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return 'en-US';
  }

  const safe = trimmed.replace(/[^a-zA-Z-]/g, '');
  return safe.length > 0 ? safe : 'en-US';
}

function normalizeCountry(value: string | undefined) {
  const trimmed = value?.trim().toUpperCase();
  if (!trimmed) {
    return 'US';
  }

  const safe = trimmed.replace(/[^A-Z]/g, '');
  return safe.length >= 2 ? safe.slice(0, 2) : 'US';
}

function toLanguageBase(language: string) {
  return language.split('-')[0]?.toLowerCase() || 'en';
}

function buildGoogleNewsUrls(keyword: string, language: string, country: string) {
  const languageBase = toLanguageBase(language);
  const query = encodeURIComponent(keyword);
  const searchUrl = `https://news.google.com/search?q=${query}&hl=${encodeURIComponent(language)}&gl=${country}&ceid=${country}:${languageBase}`;
  const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=${encodeURIComponent(language)}&gl=${country}&ceid=${country}:${languageBase}`;
  return { searchUrl, feedUrl };
}

function parseDescriptionSummary(description: string) {
  if (!description) {
    return null;
  }

  const $ = cheerio.load(description);
  const anchorText = $('a').first().text().trim();
  if (anchorText) {
    return anchorText;
  }

  const rootText = $.root().text().replace(/\s+/g, ' ').trim();
  return rootText.length > 0 ? rootText : null;
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

export async function fetchTrendingNewsFeed(input: TrendingNewsInput): Promise<TrendingNewsFeedResult> {
  const language = normalizeLanguage(input.language);
  const country = normalizeCountry(input.country);
  const { searchUrl, feedUrl } = buildGoogleNewsUrls(input.keyword, language, country);

  const response = await stealthGet(feedUrl, {
    timeoutMs: input.timeoutMs,
    provider: 'news.google.com',
    throwHttpErrors: false
  });

  const $ = cheerio.load(response.body, { xmlMode: true });

  const articles: TrendingNewsArticle[] = [];
  let sourceMetadataParsed = false;

  $('channel > item').each((_, element) => {
    if (articles.length >= input.limit) {
      return false;
    }

    const item = $(element);
    const source = item.find('source').first().text().trim() || null;
    const sourceUrl = item.find('source').first().attr('url')?.trim() || null;
    const summary = parseDescriptionSummary(item.find('description').first().text().trim());

    if (source || sourceUrl) {
      sourceMetadataParsed = true;
    }

    articles.push({
      title: item.find('title').first().text().trim(),
      googleNewsUrl: item.find('link').first().text().trim(),
      source,
      sourceUrl,
      summary,
      publishedAt: normalizeDate(item.find('pubDate').first().text()),
      guid: item.find('guid').first().text().trim() || null
    });
  });

  return {
    keyword: input.keyword,
    feedTitle: $('channel > title').first().text().trim() || null,
    searchUrl,
    feedUrl,
    language,
    country,
    articleCount: articles.length,
    articles,
    lastBuildDate: normalizeDate($('channel > lastBuildDate').first().text()),
    evidence: {
      feedFetched: response.statusCode >= 200 && response.statusCode < 400,
      itemsParsed: articles.length > 0,
      sourceMetadataParsed
    }
  };
}
