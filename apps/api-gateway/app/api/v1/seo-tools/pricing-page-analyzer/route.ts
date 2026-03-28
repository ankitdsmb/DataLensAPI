import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const pricingAnalyzerPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: pricingAnalyzerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, pricingAnalyzerPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, pricingAnalyzerPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: pricingAnalyzerPolicy.timeoutMs });
    const title = $('title').text().toLowerCase();
    const hasPricingKeyword = title.includes('pricing') || title.includes('plans');
    const priceMarkers = $('body').text().match(/\$\s?\d+/g) ?? [];
    const buttonCount = $('button, a.button, a.btn').length;

    results.push({
      url,
      hasPricingKeyword,
      priceMarkerCount: priceMarkers.length,
      buttonCount
    });
  }

  return { results };
});
