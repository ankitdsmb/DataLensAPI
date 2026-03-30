import {
  collectUrlInputs,
  createToolPolicy,
  inspectTechFingerprint,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const cmsCheckerPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: cmsCheckerPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, cmsCheckerPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, cmsCheckerPolicy);

  const results = [];

  for (const url of urls) {
    const profile = await inspectTechFingerprint({
      url,
      timeoutMs: cmsCheckerPolicy.timeoutMs
    });

    results.push({
      ...profile,
      cms: profile.status === 'analyzed' ? profile.categories.cms : []
    });
  }

  const analyzedCount = results.filter((result) => result.status === 'analyzed').length;

  return {
    status: 'analyzed',
    requestedCount: urls.length,
    analyzedCount,
    errorCount: results.length - analyzedCount,
    results,
    contract: {
      productLabel: 'CMS Checker',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Fetches public HTML and applies lightweight technology fingerprints to identify likely CMS and related site-stack signals.'
    }
  };
});
