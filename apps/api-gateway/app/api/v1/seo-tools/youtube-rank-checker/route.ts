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
  anonymous: false,
  authRequired: true,
  rateLimitPerMinute: 4,
  maxConcurrentRequests: 1,
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

  const job = await submitJob(
    'youtube-rank-checker',
    { keyword, videoUrl },
    {
      jobTtlSeconds: 12 * 60 * 60,
      artifactTtlSeconds: 6 * 60 * 60,
      artifactAccess: 'authenticated'
    }
  );

  return {
    status: 'queued',
    keyword,
    videoUrl,
    job: jobToEnvelope(job),
    contract: {
      productLabel: 'YouTube Rank Checker (Credentialed Preview)',
      forensicCategory: 'queued-simulated',
      implementationDepth: 'live_job_submission',
      launchRecommendation: 'credentialed_preview',
      notes:
        'Submits a credentialed preview job that now attempts multi-strategy YouTube search evidence parsing with provenance and degraded fallback. In free-tier launch mode this route stays blocked, but in non-free-tier mode it is available with API key auth and authenticated-only status/artifact reads, using a 12-hour job TTL and 6-hour artifact retention window.'
    }
  };
});
