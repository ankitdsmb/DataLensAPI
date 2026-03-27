import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const uservoicePolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 180
});

export const POST = withScrapingHandler({ policy: uservoicePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, uservoicePolicy);
  const urls = collectUrlInputs(body, uservoicePolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: uservoicePolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const forumCount = $('a[href*="forum"], a[href*="feedback"]').length;

    results.push({
      url,
      title,
      forumCount
    });
  }

  return { results };
});
