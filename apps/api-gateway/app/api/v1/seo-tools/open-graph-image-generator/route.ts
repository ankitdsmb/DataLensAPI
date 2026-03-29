import {
  buildOpenGraphImage,
  createToolPolicy,
  optionalIntegerField,
  optionalStringField,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const openGraphPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: openGraphPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, openGraphPolicy);
  requireAllowedFields(body, ['brand', 'eyebrow', 'height', 'subtitle', 'theme', 'title', 'width']);
  const image = buildOpenGraphImage({
    title: optionalStringField(body, 'title'),
    subtitle: optionalStringField(body, 'subtitle', '') || null,
    brand: optionalStringField(body, 'brand', '') || null,
    eyebrow: optionalStringField(body, 'eyebrow', '') || null,
    width: optionalIntegerField(body, 'width', { defaultValue: 1200, min: 600, max: 2000 }),
    height: optionalIntegerField(body, 'height', { defaultValue: 630, min: 315, max: 1200 }),
    theme: optionalStringField(body, 'theme', '') || null
  });

  return {
    ...image,
    contract: {
      productLabel: 'Open Graph Image Generator',
      forensicCategory: 'local-utility',
      implementationDepth: 'live',
      launchRecommendation: 'public_lite',
      notes:
        'Generates first-party SVG open graph artwork with deterministic layout, theme presets, wrapped text, and a previewable data URI. This is a lightweight local image generator, not a browser-rendered asset pipeline.'
    }
  };
});
