import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const youtubeTestPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: youtubeTestPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, youtubeTestPolicy);
  requireAllowedFields(body, ['videoUrl']);
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';

  if (!videoUrl) {
    throw new RequestValidationError('videoUrl is required', { field: 'videoUrl' });
  }

  return {
    videoUrl,
    status: 'rejected_for_public_catalog',
    contract: {
      productLabel: 'YouTube View Generator Test Template (Rejected)',
      forensicCategory: 'fake-engagement',
      implementationDepth: 'template',
      launchRecommendation: 'rejected_from_public_catalog',
      notes: 'Tracked for inventory only; fake-view and fake-engagement routes are excluded from the public catalog, including test variants.'
    }
  };
});
