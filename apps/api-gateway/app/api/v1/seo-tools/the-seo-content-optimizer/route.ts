import {
  analyzeKeywordDensitySection,
  analyzeMetaTagsSection,
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  optionalStringArrayField,
  readJsonBody,
  withScrapingHandler,
  RequestValidationError
} from '@forensic/scraping-core';

const seoContentOptimizerPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 128 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

function normalizeKeywords(body: Record<string, unknown>) {
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 25, fieldLabel: 'keywords' });
  if (keywords.length === 0) {
    throw new RequestValidationError('keywords is required', { field: 'keywords' });
  }
  return keywords;
}

export const POST = withScrapingHandler({ policy: seoContentOptimizerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, seoContentOptimizerPolicy);
  const urls = collectUrlInputs(body, seoContentOptimizerPolicy);
  const keywords = normalizeKeywords(body);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: seoContentOptimizerPolicy.timeoutMs });
    const meta = analyzeMetaTagsSection($, url);
    const density = analyzeKeywordDensitySection($, keywords, 20);

    const missingKeywords = density.keywordCoverage.filter((item) => item.count === 0).map((item) => item.keyword);
    const titleSuggestion = meta.title
      ? `${keywords[0]} | ${meta.title}`.slice(0, 60)
      : `${keywords[0]} | SEO Guide`.slice(0, 60);

    results.push({
      url,
      titleSuggestion,
      missingKeywords,
      keywordCoverage: density.keywordCoverage
    });
  }

  return { results };
});
