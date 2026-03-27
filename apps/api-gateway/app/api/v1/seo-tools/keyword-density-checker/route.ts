import {
  analyzeKeywordDensitySection,
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const keywordDensityCheckerPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: keywordDensityCheckerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, keywordDensityCheckerPolicy);
  const urls = collectUrlInputs(body, keywordDensityCheckerPolicy);
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 25 });
  const topN = optionalIntegerField(body, 'topN', { defaultValue: 20, min: 5, max: 50 });

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: keywordDensityCheckerPolicy.timeoutMs });
    results.push({
      url,
      analysis: analyzeKeywordDensitySection($, keywords, topN)
    });
  }

  return {
    keywordCount: keywords.length,
    results
  };
});
