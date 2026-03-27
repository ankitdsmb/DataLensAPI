import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const readabilityPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

function countSyllables(word: string) {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return 0;
  const vowels = normalized.match(/[aeiouy]+/g);
  const count = vowels ? vowels.length : 0;
  return Math.max(1, count);
}

function computeReadability(text: string) {
  const sentences = text.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0);
  const words = text.split(/\s+/).filter((word) => word.trim().length > 0);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = Math.max(1, words.length);

  const fleschReadingEase =
    206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount);

  return {
    sentences: sentenceCount,
    words: wordCount,
    syllables,
    fleschReadingEase: Number(fleschReadingEase.toFixed(2))
  };
}

export const POST = withScrapingHandler({ policy: readabilityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, readabilityPolicy);
  const urls = collectUrlInputs(body, readabilityPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: readabilityPolicy.timeoutMs });
    $('script, style, noscript, nav, header, footer').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    results.push({
      url,
      ...computeReadability(text)
    });
  }

  return { results };
});
