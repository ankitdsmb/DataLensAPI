import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const mediaSetPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: mediaSetPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, mediaSetPolicy);
  const urls = collectUrlInputs(body, mediaSetPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: mediaSetPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const imageCount = $('img').length;
    const videoCount = $('video').length;
    results.push({ url, title, imageCount, videoCount });
  }

  return { results };
});
