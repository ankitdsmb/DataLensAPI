import {
  createToolPolicy,
  readJsonBody,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';
import { jobToEnvelope, submitJob } from '@/lib/jobs/runtime';

const youtubeRankPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: youtubeRankPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, youtubeRankPolicy);
  requireAllowedFields(body, ['keyword', 'videoUrl']);
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';

  if (!keyword || !videoUrl) {
    throw new RequestValidationError('keyword and videoUrl are required', {
      field: 'keyword',
      alternateField: 'videoUrl'
    });
  }

  const job = await submitJob('youtube-rank-checker', { keyword, videoUrl });

  return {
    status: 'queued',
    keyword,
    videoUrl,
    job: jobToEnvelope(job)
  };
});
