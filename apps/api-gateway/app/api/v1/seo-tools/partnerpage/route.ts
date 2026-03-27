import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const partnerpagePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 180
});

export const POST = withScrapingHandler({ policy: partnerpagePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, partnerpagePolicy);
  const urls = collectUrlInputs(body, partnerpagePolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: partnerpagePolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const services = $('a[href*="services"], a[href*="integrations"], a[href*="apps"]').length;

    results.push({
      url,
      title,
      serviceCount: services
    });
  }

  return { results };
});
