import {
  analyzeKeywordDensitySection,
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const competitorKeywordPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: competitorKeywordPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, competitorKeywordPolicy);
  requireAllowedFields(body, ['keywords', 'url', 'urls']);
  const urls = collectUrlInputs(body, competitorKeywordPolicy);
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 25 });

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: competitorKeywordPolicy.timeoutMs });
    const density = analyzeKeywordDensitySection($, keywords, 25);
    const recommended = density.topKeywords.slice(0, 10).map((item) => item.keyword);

    results.push({
      url,
      topKeywords: density.topKeywords,
      recommendedTerms: recommended
    });
  }

  return { results };
});
