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
  maxUrlCount: 10,
  anonymous: true,
  cacheTtlSeconds: 60
});

export const POST = withScrapingHandler({ policy: snapifyPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, snapifyPolicy);
  requireAllowedFields(body, ['url', 'urls']);
  const urls = collectUrlInputs(body, snapifyPolicy);

  const job = await submitJob('snapify-capture-screenshot-save-pdf', { urls });

  return {
    status: 'queued',
    urls,
    job: jobToEnvelope(job),
    contract: {
      productLabel: 'Snapify Capture Screenshot / Save PDF (Internal Preview)',
      forensicCategory: 'queued-simulated',
      implementationDepth: 'live_job_submission',
      launchRecommendation: 'internal_only_preview',
      notes:
        'Submits an internal preview job that currently captures live HTML evidence and metadata only. It does not yet render screenshot or PDF binaries for public launch.'
    }
  };
});
