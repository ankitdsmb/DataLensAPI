import {
  collectUrlInputs,
  createToolPolicy,
  inspectWhatSiteProfile,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const whatSitePolicy = createToolPolicy({
  timeoutMs: 8000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: whatSitePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, whatSitePolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, whatSitePolicy);

  const results = [];

  for (const url of urls) {
    results.push(await inspectWhatSiteProfile({
      url,
      timeoutMs: whatSitePolicy.timeoutMs
    }));
  }

  const analyzedCount = results.filter((result) => result.status === 'analyzed').length;
  const errorCount = results.length - analyzedCount;

  return {
    status: 'analyzed',
    requestedCount: urls.length,
    analyzedCount,
    errorCount,
    results,
    contract: {
      productLabel: 'What Site',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Fetches public HTML and returns a lightweight site profile with metadata, heading, link, and content signals for each supplied URL.'
    }
  };
});
