import {
  assertHttpUrl,
  createToolPolicy,
  readJsonBody,
  readApiKeyFromRequest,
  RequestValidationError,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';
import { jobToEnvelope, submitJob } from '@/lib/jobs/runtime';

const SUPPORTED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com'
]);

function assertYouTubeVideoUrl(videoUrl: string): string {
  const normalized = assertHttpUrl(videoUrl);
  const hostname = new URL(normalized).hostname.toLowerCase();

  if (!SUPPORTED_YOUTUBE_HOSTS.has(hostname)) {
    throw new RequestValidationError('videoUrl must be a supported YouTube video URL', {
      field: 'videoUrl',
      hostname
    });
  }

  return normalized;
}

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
  const rawVideoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';

  if (!keyword || !rawVideoUrl) {
    throw new RequestValidationError('keyword and videoUrl are required', {
      field: 'keyword',
      alternateField: 'videoUrl'
    });
  }

  const videoUrl = assertYouTubeVideoUrl(rawVideoUrl);

  const job = await submitJob(
    'youtube-rank-checker',
    { keyword, videoUrl },
    {
      jobTtlSeconds: 12 * 60 * 60,
      artifactTtlSeconds: 6 * 60 * 60,
      artifactAccess: 'authenticated',
      submitterApiKey: readApiKeyFromRequest(req)
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
      launchRecommendation: 'credentialed_preview_only',
      notes:
        'Submits a credentialed preview-only job that enforces supported YouTube video URLs, attempts multi-strategy HTML parsing plus a browser-assisted DOM fallback with provenance, and still degrades honestly when live evidence cannot be collected. In free-tier launch mode this route stays blocked, and in non-free-tier mode it remains a submitter-bound preview path with API key auth, a 12-hour job TTL, and a 6-hour artifact retention window. It is intentionally not part of the supported public subset beyond preview use.'
    }
  };
});
