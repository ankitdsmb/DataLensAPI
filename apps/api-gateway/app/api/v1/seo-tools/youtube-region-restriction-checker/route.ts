import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';

const regionPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: regionPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, regionPolicy);
  requireAllowedFields(body, ['videoId']);
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';

  if (!videoId) {
    throw new RequestValidationError('videoId is required', { field: 'videoId' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  return {
    videoId,
    videoUrl,
    status: 'pending',
    contract: {
      productLabel: 'YouTube Region Restriction Checker Link Helper',
      forensicCategory: 'link-builder',
      implementationDepth: 'helper',
      launchRecommendation: 'public_lite',
      notes: 'Builds a canonical YouTube watch URL but does not fetch region restriction metadata.'
    }
  };
});
