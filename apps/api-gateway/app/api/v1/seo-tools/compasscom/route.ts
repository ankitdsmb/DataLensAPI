import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const compassPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: compassPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, compassPolicy);
  const urls = collectUrlInputs(body, compassPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: compassPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const priceMarkers = $('body').text().match(/\$\s?\d+[,\d]*/g) ?? [];
    const listingCount = $('[data-testid="listing-card"], .listing-card').length;

    results.push({
      url,
      title,
      listingCount,
      priceMarkerCount: priceMarkers.length
    });
  }

  return { results };
});
