import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const funnelSniperPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: funnelSniperPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, funnelSniperPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, funnelSniperPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: funnelSniperPolicy.timeoutMs });
    const ctaCount = $('button, a.button, a.btn, a[href*="signup"], a[href*="pricing"]').length;
    const priceMarkers = $('body').text().match(/\$\s?\d+/g) ?? [];

    results.push({
      url,
      ctaCount,
      priceMarkerCount: priceMarkers.length
    });
  }

  return { results };
});
