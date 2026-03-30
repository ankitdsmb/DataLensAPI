import {
  assertPublicHttpUrl,
  collectUrlInputs,
  createToolPolicy,
  readJsonBody,
  readApiKeyFromRequest,
  withScrapingHandler,
  requireAllowedFields
} from '@forensic/scraping-core';
import { jobToEnvelope, submitJob } from '@/lib/jobs/runtime';

const SNAPIFY_CAPTURE_HOST_ALLOWLIST = (process.env.SNAPIFY_CAPTURE_HOST_ALLOWLIST ?? '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

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
  const urls = collectUrlInputs(body, snapifyPolicy).map((url) =>
    assertPublicHttpUrl(url, { allowHosts: SNAPIFY_CAPTURE_HOST_ALLOWLIST })
  );

  const job = await submitJob(
    'snapify-capture-screenshot-save-pdf',
    { urls },
    {
      jobTtlSeconds: 6 * 60 * 60,
      artifactTtlSeconds: 2 * 60 * 60,
      artifactAccess: 'authenticated',
      submitterApiKey: readApiKeyFromRequest(req)
    }
  );

  return {
    status: 'queued',
    urls,
    job: jobToEnvelope(job),
    contract: {
      productLabel: 'Snapify Capture Screenshot / Save PDF (Authenticated Beta)',
      forensicCategory: 'queued-browser',
      implementationDepth: 'live_job_submission',
      launchRecommendation: 'authenticated_beta',
      notes:
        'Submits a stable authenticated-beta job to a browser-backed worker that renders real screenshot and PDF artifacts with page-dimension and artifact-size budgets plus public-host validation at the gateway. In free-tier launch mode this route stays blocked, but in non-free-tier mode it is available with API key auth, a single-URL limit, and submitter-bound status/artifact reads with a 6-hour job TTL and 2-hour artifact retention window. Broader promotion is intentionally deferred until a separate hardening phase is approved.'
    }
  };
});
