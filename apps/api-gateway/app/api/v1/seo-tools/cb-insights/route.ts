import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const cbInsightsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: cbInsightsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, cbInsightsPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, cbInsightsPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: cbInsightsPolicy.timeoutMs });
    const title = $('title').text().trim() || null;
    const description = $('meta[name="description"]').attr('content')?.trim() ?? null;
    const tagCount = $('a[href*="/research"]').length;

    results.push({
      url,
      title,
      description,
      researchLinkCount: tagCount
    });
  }

  return { results };
});
