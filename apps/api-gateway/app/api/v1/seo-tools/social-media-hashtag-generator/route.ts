import {
  createToolPolicy,
  generateSocialHashtags,
  optionalBooleanField,
  optionalIntegerField,
  optionalStringArrayField,
  optionalStringField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const hashtagPolicy = createToolPolicy({
  timeoutMs: 5000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 120
});

function normalizeKeywords(body: Record<string, unknown>) {
  const keywords = optionalStringArrayField(body, 'keywords', { maxItems: 50, fieldLabel: 'keywords' });
  return keywords;
}

export const POST = withScrapingHandler({ policy: hashtagPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, hashtagPolicy);
  requireAllowedFields(body, ['combineKeywords', 'includeBroad', 'keywords', 'maxTags', 'platform']);
  const keywords = normalizeKeywords(body);
  const result = generateSocialHashtags(keywords, {
    platform: optionalStringField(body, 'platform', ''),
    maxTags: optionalIntegerField(body, 'maxTags', { defaultValue: 12, min: 1, max: 50 }),
    includeBroad: optionalBooleanField(body, 'includeBroad', true),
    combineKeywords: optionalBooleanField(body, 'combineKeywords', true)
  });

  return {
    ...result,
    contract: {
      productLabel: 'Social Media Hashtag Generator',
      forensicCategory: 'local-utility',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Runs a deterministic hashtag composition engine with keyword normalization, platform presets, ranking, grouped suggestions, and duplicate control. This is a local suggestion utility, not a live social trend scraper.'
    }
  };
});
