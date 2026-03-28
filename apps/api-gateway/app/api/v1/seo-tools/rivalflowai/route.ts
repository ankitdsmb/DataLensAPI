import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const rivalFlowPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 180
});

export const POST = withScrapingHandler({ policy: rivalFlowPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, rivalFlowPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, rivalFlowPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: rivalFlowPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const description =
      $('meta[property="og:description"]').attr('content')?.trim()
      || $('meta[name="description"]').attr('content')?.trim()
      || null;
    const headings = $('h1, h2, h3').length;

    results.push({
      url,
      title,
      description,
      headingCount: headings
    });
  }

  return { results };
});
