import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const capterraPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: capterraPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, capterraPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, capterraPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: capterraPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim() ?? null;
    const reviewMarkers = $('body').text().match(/reviews?/gi) ?? [];

    results.push({
      url,
      title,
      description,
      reviewMentionCount: reviewMarkers.length
    });
  }

  return { results };
});
