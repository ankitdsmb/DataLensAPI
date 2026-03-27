import {
  analyzeKeywordDensitySection,
  createToolPolicy,
  fetchHtmlDocument,
  optionalIntegerField,
  optionalStringArrayField,
  readJsonBody,
  collectUrlInputs,
  withScrapingHandler
} from '@forensic/scraping-core';

const keywordDensityPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: keywordDensityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, keywordDensityPolicy);
  const urls = collectUrlInputs(body, keywordDensityPolicy);
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 25 });
  const topN = optionalIntegerField(body, 'topN', { defaultValue: 20, min: 5, max: 50 });

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: keywordDensityPolicy.timeoutMs });
    const analysis = analyzeKeywordDensitySection($, keywords, topN);

    results.push({
      url,
      analysis
    });
  }

  return {
    keywordCount: keywords.length,
    results
  };
});
