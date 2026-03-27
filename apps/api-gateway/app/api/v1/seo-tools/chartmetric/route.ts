import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const chartmetricPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: chartmetricPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, chartmetricPolicy);
  const urls = collectUrlInputs(body, chartmetricPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: chartmetricPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim() ?? null;
    const statCount = $('.stat, .metric, [data-metric]').length;

    results.push({
      url,
      title,
      description,
      statCount
    });
  }

  return { results };
});
