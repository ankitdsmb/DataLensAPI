import {
  analyzeHeadingsSection,
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const headingsCheckerPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: headingsCheckerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, headingsCheckerPolicy);
  const urls = collectUrlInputs(body, headingsCheckerPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: headingsCheckerPolicy.timeoutMs });
    results.push({
      url,
      analysis: analyzeHeadingsSection($)
    });
  }

  return {
    results
  };
});
