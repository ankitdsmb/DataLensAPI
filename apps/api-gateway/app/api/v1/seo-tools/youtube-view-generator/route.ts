import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields,
  optionalStringField
, enqueueJob
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

  return { job: enqueueJob('youtube-view-generator', { videoUrl }) };
});
