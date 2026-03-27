import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const appsumoPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: appsumoPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, appsumoPolicy);
  const urls = collectUrlInputs(body, appsumoPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: appsumoPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim() ?? null;
    const priceMarkers = $('body').text().match(/\$\s?\d+/g) ?? [];

    results.push({
      url,
      title,
      description,
      priceMarkerCount: priceMarkers.length
    });
  }

  return { results };
});
