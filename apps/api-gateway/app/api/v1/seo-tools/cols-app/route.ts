import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const colsAppPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: colsAppPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, colsAppPolicy);
  const urls = collectUrlInputs(body, colsAppPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: colsAppPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim() ?? null;
    results.push({ url, title, description });
  }

  return { results };
});
