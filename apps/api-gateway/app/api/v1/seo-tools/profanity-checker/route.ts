import {
  analyzeProfanityText,
  createToolPolicy,
  optionalStringArrayField,
  optionalStringField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const profanityPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

export const POST = withScrapingHandler({ policy: profanityPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, profanityPolicy);
  requireAllowedFields(body, ['customWords', 'text']);

  const result = analyzeProfanityText(
    optionalStringField(body, 'text'),
    optionalStringArrayField(body, 'customWords', { maxItems: 25, fieldLabel: 'customWords' })
  );

  return {
    ...result,
    contract: {
      productLabel: 'Profanity Checker',
      forensicCategory: 'local-utility',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Runs a deterministic local moderation lexicon with whole-word matching, light obfuscation normalization, position-aware masking, and optional custom terms. This is a lightweight moderation utility, not a full trust-and-safety classifier.'
    }
  };
});
