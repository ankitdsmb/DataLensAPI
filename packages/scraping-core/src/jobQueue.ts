import * as fs from 'fs';
import * as path from 'path';
import type { ApiJob, ApiJobStatus } from '@forensic/shared-types';
import { createRequestId } from './apiWrapper';

const JOBS_DIR = path.resolve(__dirname, '../../../../.jobs');

function ensureJobsDir() {
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
  }
}

export function enqueueJob(toolName: string, payload: unknown): ApiJob {
  ensureJobsDir();
  const id = `job_${createRequestId().replace('req_', '')}`;
  const job: ApiJob = {
    id,
    status: 'queued',
    status_url: `/api/v1/jobs/${id}`,
    artifact_urls: []
  };

  const jobData = {
    tool: toolName,
    payload,
    job
  };

  fs.writeFileSync(path.join(JOBS_DIR, `${id}.json`), JSON.stringify(jobData, null, 2), 'utf-8');
  return job;
}

export function getJob(jobId: string): ApiJob | null {
  ensureJobsDir();
  const filePath = path.join(JOBS_DIR, `${jobId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.job as ApiJob;
  } catch {
    return null;
  }
}

export function updateJob(jobId: string, updates: Partial<ApiJob>): ApiJob | null {
  ensureJobsDir();
  const filePath = path.join(JOBS_DIR, `${jobId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data.job = { ...data.job, ...updates };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return data.job as ApiJob;
  } catch {
    return null;
  }
}
