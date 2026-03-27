import {
  collectUrlInputs,
  createToolPolicy,
  optionalBooleanField,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  stealthGet,
  withScrapingHandler
} from '@forensic/scraping-core';
import * as cheerio from 'cheerio';
// @ts-ignore - Assuming stopword doesn't have proper types or we ignore them for speed
import * as sw from 'stopword';

const keywordDensityPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

function buildNgrams(words: string[], size: number) {
  const counts: Record<string, number> = {};

  for (let index = 0; index <= words.length - size; index += 1) {
    const phrase = words.slice(index, index + size).join(' ');
    counts[phrase] = (counts[phrase] || 0) + 1;
  }

  return counts;
}

function normalizeTermCounts(words: string[]) {
  const counts: Record<string, number> = {};
  words.forEach((word) => {
    counts[word] = (counts[word] || 0) + 1;
  });

  return counts;
}

function analyzeKeywordCoverage(rawText: string, keywords: string[]) {
  const haystack = rawText.toLowerCase();

  return keywords.map((keyword) => {
    const normalizedKeyword = keyword.toLowerCase();
    const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = haystack.match(new RegExp(`\\b${escapedKeyword}\\b`, 'g')) ?? [];

    return {
      keyword,
      count: matches.length
    };
  });
}

export const POST = withScrapingHandler({ policy: keywordDensityPolicy }, async (req: Request) => {

    const body = await readJsonBody<Record<string, unknown>>(req, keywordDensityPolicy);
    const urls = collectUrlInputs(body, keywordDensityPolicy);
    const requestedKeywords = optionalStringArrayField(body, 'keywords', { maxItems: 50 });
    const includeNgrams = optionalBooleanField(body, 'includeNgrams', false);
    const topN = optionalIntegerField(body, 'topN', { defaultValue: 50, min: 1, max: 200 });

    const pages = [];

    for (const url of urls) {
      const response = await stealthGet(url, { timeoutMs: keywordDensityPolicy.timeoutMs });
      const $ = cheerio.load(response.body);

      const title = $('title').first().text().trim() || null;
      const h1 = $('h1').first().text().trim() || null;

      // Remove unwanted elements before extracting the analysis body text.
      $('script, style, noscript, nav, header, footer, iframe, img').remove();

      const rawText = $('body').text().replace(/\s+/g, ' ').trim();
      const words = rawText
        .replace(/[^a-zA-Z\s]/g, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2);

      const meaningfulWords = sw.removeStopwords(words);
      const wordCounts = normalizeTermCounts(meaningfulWords);
      const totalWords = meaningfulWords.length;

      const topKeywords = Object.keys(wordCounts)
        .map((word) => ({
          keyword: word,
          count: wordCounts[word],
          density: totalWords === 0 ? 0 : Number(((wordCounts[word] / totalWords) * 100).toFixed(2))
        }))
        .sort((left, right) => right.count - left.count)
        .slice(0, topN);

      const keywordCoverage = analyzeKeywordCoverage(rawText, requestedKeywords).map((item) => ({
        ...item,
        density: totalWords === 0 ? 0 : Number(((item.count / totalWords) * 100).toFixed(2)),
        inTitle: title ? title.toLowerCase().includes(item.keyword.toLowerCase()) : false,
        inH1: h1 ? h1.toLowerCase().includes(item.keyword.toLowerCase()) : false
      }));

      const stuffingRisk = keywordCoverage.some((item) => item.density >= 5)
        ? 'high'
        : keywordCoverage.some((item) => item.density >= 3)
          ? 'medium'
          : 'low';

      const pageResult: Record<string, unknown> = {
        url,
        title,
        h1,
        totalWords,
        topKeywords,
        keywordCoverage,
        stuffingRisk
      };

      if (includeNgrams) {
        const bigrams = buildNgrams(meaningfulWords, 2);
        const trigrams = buildNgrams(meaningfulWords, 3);
        pageResult.ngrams = {
          bigrams: Object.keys(bigrams)
            .map((keyword) => ({
              keyword,
              count: bigrams[keyword]
            }))
            .sort((left, right) => right.count - left.count)
            .slice(0, Math.min(topN, 25)),
          trigrams: Object.keys(trigrams)
            .map((keyword) => ({
              keyword,
              count: trigrams[keyword]
            }))
            .sort((left, right) => right.count - left.count)
            .slice(0, Math.min(topN, 25))
        };
      }

      pages.push(pageResult);
    }

    const totalAnalyzedWords = pages.reduce((sum, page) => sum + Number(page.totalWords ?? 0), 0);
    const summary = {
      pageCount: pages.length,
      requestedKeywordCount: requestedKeywords.length,
      totalAnalyzedWords
    };

    if (pages.length === 1) {
      const firstPage = pages[0] as Record<string, unknown>;
      return {
        url: firstPage.url,
        analyzed_word_count: firstPage.totalWords,
        keywords: firstPage.topKeywords,
        pages,
        summary
      };
    }

    return {
      pages,
      summary
    };
});
