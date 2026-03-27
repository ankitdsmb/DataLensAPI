import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const myAnimeListPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: myAnimeListPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, myAnimeListPolicy);
  const urls = collectUrlInputs(body, myAnimeListPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: myAnimeListPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const score = $('[itemprop="ratingValue"]').first().text().trim() || null;
    results.push({ url, title, score });
  }

  return { results };
});
