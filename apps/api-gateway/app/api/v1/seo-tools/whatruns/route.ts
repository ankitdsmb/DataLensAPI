import {
  collectUrlInputs,
  createToolPolicy,
  inspectTechFingerprint,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const whatRunsPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: whatRunsPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, whatRunsPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, whatRunsPolicy);

  const results = [];

  for (const url of urls) {
    results.push(await inspectTechFingerprint({
      url,
      timeoutMs: whatRunsPolicy.timeoutMs
    }));
  }

  const analyzedCount = results.filter((result) => result.status === 'analyzed').length;

  return {
    status: 'analyzed',
    requestedCount: urls.length,
    analyzedCount,
    errorCount: results.length - analyzedCount,
    results,
    contract: {
      productLabel: 'WhatRuns',
      forensicCategory: 'html-scraper',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Fetches public HTML and applies lightweight technology fingerprints to identify likely CMS, frontend, ecommerce, analytics, and infrastructure signals.'
    }
  };
});
