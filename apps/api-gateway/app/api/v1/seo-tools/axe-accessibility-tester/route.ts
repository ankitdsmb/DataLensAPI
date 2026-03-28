import {
  analyzeImageSeoSection,
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const axeTesterPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: axeTesterPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, axeTesterPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, axeTesterPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: axeTesterPolicy.timeoutMs });
    const images = analyzeImageSeoSection($, url);
    const buttons = $('button').toArray();
    const buttonsMissingLabels = buttons.filter((button) => {
      const text = $(button).text().trim();
      const aria = $(button).attr('aria-label')?.trim();
      return !text && !aria;
    }).length;

    results.push({
      url,
      missingAltCount: images.missingAltCount,
      buttonsMissingLabels
    });
  }

  return { results };
});
