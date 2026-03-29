import {
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';
import { jobToEnvelope, submitJob } from '@/lib/jobs/runtime';

const snapifyPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: false,
  authRequired: true,
  rateLimitPerMinute: 2,
  maxConcurrentRequests: 1,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: snapifyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, snapifyPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, snapifyPolicy);

  const job = await submitJob(
    'snapify-capture-screenshot-save-pdf',
    { urls },
    {
      jobTtlSeconds: 6 * 60 * 60,
      artifactTtlSeconds: 2 * 60 * 60,
      artifactAccess: 'authenticated'
    }
  );

  return {
    status: 'queued',
    urls,
    job: jobToEnvelope(job),
    contract: {
      productLabel: 'Snapify Capture Screenshot / Save PDF (Credentialed Preview)',
      forensicCategory: 'queued-browser',
      implementationDepth: 'live_job_submission',
      launchRecommendation: 'credentialed_preview',
      notes:
        'Submits a credentialed preview job to a browser-backed worker that now renders real screenshot and PDF artifacts. In free-tier launch mode this route stays blocked, but in non-free-tier mode it is available with API key auth, a single-URL limit, and authenticated-only status/artifact reads with a 6-hour job TTL and 2-hour artifact retention window.'
    }
  };
});
