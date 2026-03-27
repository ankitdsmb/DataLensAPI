import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const authorFinderPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: authorFinderPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, authorFinderPolicy);
  const urls = collectUrlInputs(body, authorFinderPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: authorFinderPolicy.timeoutMs });
    const author =
      $('meta[name="author"]').attr('content')?.trim()
      || $('meta[property="article:author"]').attr('content')?.trim()
      || $('.author, .byline, [rel="author"]').first().text().trim()
      || null;

    results.push({ url, author });
  }

  return { results };
});
