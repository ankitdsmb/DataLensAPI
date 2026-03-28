import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler
, enqueueJob
} from '@forensic/scraping-core';

const youtubeRankPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: youtubeRankPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, youtubeRankPolicy);
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';

  if (!keyword || !videoUrl) {
    throw new RequestValidationError('keyword and videoUrl are required', {
      field: 'keyword',
      alternateField: 'videoUrl'
    });
  }

  return { job: enqueueJob('youtube-rank-checker', { keyword, videoUrl }) };
});
