import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const snapifyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: snapifyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, snapifyPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, snapifyPolicy);

  return {
    status: 'queued',
    urls,
    contract: {
      productLabel: 'Snapify Capture Queue Stub',
      forensicCategory: 'queued-placeholder',
      implementationDepth: 'template',
      launchRecommendation: 'defer_from_public_launch',
      notes: 'Accepts and validates URLs, but no screenshot or PDF artifact pipeline is connected in this route.'
    }
  };
});
