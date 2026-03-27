import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
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
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';

  if (!videoUrl) {
    throw new RequestValidationError('videoUrl is required', { field: 'videoUrl' });
  }

  return {
    videoUrl,
    status: 'test-only'
  };
});
