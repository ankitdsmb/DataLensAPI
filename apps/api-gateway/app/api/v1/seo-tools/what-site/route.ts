import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const whatSitePolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: whatSitePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, whatSitePolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, whatSitePolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: whatSitePolicy.timeoutMs });
    results.push({
      url,
      title: $('title').text().trim() || null,
      description: $('meta[name="description"]').attr('content')?.trim() ?? null
    });
  }

  return { results };
});
