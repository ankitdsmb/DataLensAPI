import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields,
  optionalStringField
} from '@forensic/scraping-core';

const youtubeViewPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: youtubeViewPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, youtubeViewPolicy);
  requireAllowedFields(body, ['videoUrl']);
  const videoUrl = optionalStringField(body, 'videoUrl');

  if (!videoUrl) {
    throw new RequestValidationError('videoUrl is required', { field: 'videoUrl' });
  }

  return {
    videoUrl,
    status: 'rejected_for_public_catalog',
    contract: {
      productLabel: 'YouTube View Generator Template (Rejected)',
      forensicCategory: 'fake-engagement',
      implementationDepth: 'template',
      launchRecommendation: 'rejected_from_public_catalog',
      notes: 'Tracked for inventory only; fake-view and fake-engagement routes are excluded from the public catalog.'
    }
  };
});
