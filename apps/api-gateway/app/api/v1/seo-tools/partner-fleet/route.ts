import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const partnerFleetPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 180
});

export const POST = withScrapingHandler({ policy: partnerFleetPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, partnerFleetPolicy);
  const urls = collectUrlInputs(body, partnerFleetPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: partnerFleetPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const integrations = $('a[href*="integrations"], a[href*="apps"]').length;

    results.push({
      url,
      title,
      integrationCount: integrations
    });
  }

  return { results };
});
