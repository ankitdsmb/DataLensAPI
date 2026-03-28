import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const websitesTrafficPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 20,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: websitesTrafficPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, websitesTrafficPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, websitesTrafficPolicy);

  return {
    status: 'rejected_for_public_catalog',
    urls,
    contract: {
      productLabel: 'Websites Traffic Generator Template (Rejected)',
      forensicCategory: 'traffic-simulation',
      implementationDepth: 'template',
      launchRecommendation: 'rejected_from_public_catalog',
      notes: 'Tracked for inventory only; traffic-simulation and fake-engagement routes are excluded from the public catalog.'
    }
  };
});
