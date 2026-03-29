import {
  createToolPolicy,
  generateSerpMetaTitles,
  optionalBooleanField,
  optionalIntegerField,
  optionalStringField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const serpTitlePolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: serpTitlePolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, serpTitlePolicy);
  requireAllowedFields(body, ['audience', 'brand', 'includeYear', 'intent', 'keyword', 'location', 'maxTitles']);

  const result = generateSerpMetaTitles(optionalStringField(body, 'keyword'), {
    brand: optionalStringField(body, 'brand', '') || null,
    audience: optionalStringField(body, 'audience', '') || null,
    location: optionalStringField(body, 'location', '') || null,
    intent: optionalStringField(body, 'intent', '') || null,
    maxTitles: optionalIntegerField(body, 'maxTitles', { defaultValue: 6, min: 3, max: 10 }),
    includeYear: optionalBooleanField(body, 'includeYear', true)
  });

  return {
    ...result,
    contract: {
      productLabel: 'SERP Meta Title Generator',
      forensicCategory: 'local-utility',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Runs a deterministic SEO title engine with intent-aware variants, brand placement, and pixel-width heuristics to recommend stronger SERP titles. This is local scoring logic, not live competitive SERP scraping.'
    }
  };
});
