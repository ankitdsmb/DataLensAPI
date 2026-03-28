import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const appodealPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: appodealPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, appodealPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, appodealPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: appodealPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim() ?? null;
    const metricCount = $('table, .metric, .stats').length;

    results.push({ url, title, description, metricCount });
  }

  return { results };
});
