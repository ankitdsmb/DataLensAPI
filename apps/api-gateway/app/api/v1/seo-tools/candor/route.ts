import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const candorPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: candorPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, candorPolicy);
  const urls = collectUrlInputs(body, candorPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: candorPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim() ?? null;
    const salaryMarkers = $('body').text().match(/\$\s?\d+[kK]/g) ?? [];

    results.push({
      url,
      title,
      description,
      salaryMarkerCount: salaryMarkers.length
    });
  }

  return { results };
});
