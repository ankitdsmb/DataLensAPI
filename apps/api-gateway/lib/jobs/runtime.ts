import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readApiKeyFromRequest, RequestValidationError } from '@forensic/scraping-core';
import type {
  JobArtifactRef,
  JobContract,
  JobArtifactAccess,
  JobError,
  JobExecutionMetadata,
  JobRetentionPolicy,
  JobState
} from '@forensic/shared-types';

const DATA_ROOT = path.join(process.cwd(), '.data', 'jobs');
const JOBS_FILE = path.join(DATA_ROOT, 'jobs.json');
const ARTIFACT_ROOT = path.join(DATA_ROOT, 'artifacts');
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL ?? 'http://localhost:3000';
const DEFAULT_RETENTION_POLICY: JobRetentionPolicy = {
  jobTtlSeconds: DEFAULT_TTL_MS / 1000,
  artifactTtlSeconds: DEFAULT_TTL_MS / 1000,
  artifactAccess: 'public'
};

type SubmitJobOptions = Partial<JobRetentionPolicy> & {
  submitterApiKey?: string | null;
};

type StoredJobContract = JobContract & {
  access?: {
    scope: 'public' | 'authenticated' | 'submitter';
    submitterKeyHash?: string | null;
  };
};

type ArtifactLookupResult =
  | {
      status: 'found';
      artifact: JobArtifactRef;
      job: StoredJobContract;
      content: unknown;
    }
  | {
      status: 'expired';
      artifact: JobArtifactRef;
      job: StoredJobContract;
    }
  | {
      status: 'missing';
    };

type JobsDb = { jobs: Record<string, StoredJobContract> };

type ExecuteResponse = {
  result: Record<string, unknown>;
  execution?: JobExecutionMetadata;
  artifacts?: Array<{
    id?: string;
    type?: JobArtifactRef['type'];
    title?: string;
    content: unknown;
  }>;
};

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureStorage() {
  await mkdir(DATA_ROOT, { recursive: true });
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  try {
    await readFile(JOBS_FILE, 'utf8');
  } catch {
    await writeFile(JOBS_FILE, JSON.stringify({ jobs: {} }, null, 2), 'utf8');
  }
}

async function readDb(): Promise<JobsDb> {
  await ensureStorage();
  const raw = await readFile(JOBS_FILE, 'utf8');
  return JSON.parse(raw) as JobsDb;
}

async function writeDb(db: JobsDb) {
  await ensureStorage();
  await writeFile(JOBS_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  return next;
}

function createJobId() {
  return `job_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toIsoFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function resolveRetentionPolicy(options?: SubmitJobOptions): JobRetentionPolicy {
  return {
    ...DEFAULT_RETENTION_POLICY,
    ...(options ?? {})
  };
}

function markExpired(job: StoredJobContract): StoredJobContract {
  if ((job.state === 'queued' || job.state === 'running') && new Date(job.timestamps.expiresAt).getTime() <= Date.now()) {
    return {
      ...job,
      state: 'expired',
      progress: job.progress < 100 ? job.progress : 99,
      error: {
        code: 'job_expired',
        message: 'Job exceeded retention window before completion',
        retriable: false,
        details: null
      },
      timestamps: {
        ...job.timestamps,
        completedAt: nowIso(),
        updatedAt: nowIso()
      }
    };
  }

  return job;
}

function hashApiKey(apiKey: string | null | undefined): string | null {
  const normalized = apiKey?.trim();
  if (!normalized) {
    return null;
  }

  return createHash('sha256').update(normalized).digest('hex');
}

function isAuthenticatedJobAccess(req: Request): boolean {
  const configuredKeys = (process.env.FREE_TIER_API_KEYS ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

  if (configuredKeys.length === 0) {
    return false;
  }

  return configuredKeys.includes(readApiKeyFromRequest(req));
}

function resolveJobAccess(retention: JobRetentionPolicy, options?: SubmitJobOptions): StoredJobContract['access'] {
  if (retention.artifactAccess !== 'authenticated') {
    return { scope: 'public', submitterKeyHash: null };
  }

  const submitterKeyHash = hashApiKey(options?.submitterApiKey);
  if (submitterKeyHash) {
    return { scope: 'submitter', submitterKeyHash };
  }

  return { scope: 'authenticated', submitterKeyHash: null };
}

export function assertJobReadAccess(req: Request, job: StoredJobContract) {
  if (job.retention.artifactAccess !== 'authenticated') {
    return;
  }

  if (!isAuthenticatedJobAccess(req)) {
    const error = new RequestValidationError('valid API key is required for internal preview job access', {
      jobId: job.id,
      tool: job.tool,
      acceptedHeaders: ['x-api-key', 'authorization: Bearer <key>'],
      artifactAccess: job.retention.artifactAccess
    });
    error.status = 401;
    error.code = 'unauthorized';
    throw error;
  }

  if (job.access?.scope === 'submitter') {
    const callerKeyHash = hashApiKey(readApiKeyFromRequest(req));
    if (!callerKeyHash || callerKeyHash !== job.access.submitterKeyHash) {
      const ownershipError = new RequestValidationError(
        'preview job access is restricted to the submitting API key',
        {
          jobId: job.id,
          tool: job.tool,
          accessScope: job.access.scope
        }
      );
      ownershipError.status = 403;
      ownershipError.code = 'forbidden';
      throw ownershipError;
    }
  }
}

export async function submitJob(tool: string, payload: Record<string, unknown>, options?: SubmitJobOptions) {
  const queuedAt = nowIso();
  const retention = resolveRetentionPolicy(options);
  const job: StoredJobContract = {
    id: createJobId(),
    tool,
    state: 'queued',
    payload,
    progress: 0,
    timestamps: {
      queuedAt,
      updatedAt: queuedAt,
      expiresAt: toIsoFromNow(retention.jobTtlSeconds)
    },
    retention,
    access: resolveJobAccess(retention, options),
    execution: {
      mode: 'template',
      readyForPublicLaunch: false,
      notes: 'Job queued; execution metadata will be finalized by the worker.'
    },
    artifacts: []
  };

  await enqueueWrite(async () => {
    const db = await readDb();
    db.jobs[job.id] = job;
    await writeDb(db);
  });

  void processJob(job.id);
  return job;
}

export async function getJob(jobId: string): Promise<StoredJobContract | null> {
  const db = await readDb();
  const found = db.jobs[jobId];
  if (!found) return null;

  const normalized = markExpired(found);
  if (normalized !== found) {
    await enqueueWrite(async () => {
      const latest = await readDb();
      latest.jobs[jobId] = normalized;
      await writeDb(latest);
    });
  }

  return normalized;
}

async function updateJob(jobId: string, updater: (current: StoredJobContract) => StoredJobContract | null) {
  await enqueueWrite(async () => {
    const db = await readDb();
    const current = db.jobs[jobId];
    if (!current) return;
    const next = updater(current);
    if (!next) return;
    db.jobs[jobId] = next;
    await writeDb(db);
  });
}

function toJobError(error: unknown): JobError {
  if (error instanceof Error) {
    return {
      code: 'job_execution_failed',
      message: error.message,
      retriable: true,
      details: null
    };
  }

  return {
    code: 'job_execution_failed',
    message: 'Unknown job execution failure',
    retriable: true,
    details: { error }
  };
}

async function persistArtifacts(job: StoredJobContract, artifacts: NonNullable<ExecuteResponse['artifacts']>) {
  const refs: JobArtifactRef[] = [];

  for (let index = 0; index < artifacts.length; index += 1) {
    const artifact = artifacts[index];
    const artifactId = artifact.id?.trim() || `artifact_${index + 1}`;
    const filePath = path.join(ARTIFACT_ROOT, `${job.id}-${artifactId}.json`);
    const createdAt = nowIso();
    await writeFile(filePath, JSON.stringify(artifact.content, null, 2), 'utf8');

    refs.push({
      id: artifactId,
      type: artifact.type ?? 'json',
      title: artifact.title ?? `${artifactId} output`,
      path: filePath,
      url: `/api/v1/jobs/${job.id}/artifacts/${artifactId}`,
      createdAt,
      expiresAt: toIsoFromNow(job.retention.artifactTtlSeconds)
    });
  }

  return refs;
}

export async function getArtifactRecord(jobId: string, artifactId: string): Promise<ArtifactLookupResult> {
  const job = await getJob(jobId);
  if (!job) {
    return { status: 'missing' };
  }

  const artifact = job.artifacts.find((item) => item.id === artifactId);
  if (!artifact) {
    return { status: 'missing' };
  }

  const expired =
    new Date(job.timestamps.expiresAt).getTime() <= Date.now() ||
    new Date(artifact.expiresAt).getTime() <= Date.now();
  if (expired) {
    return { status: 'expired', job, artifact };
  }

  try {
    const raw = await readFile(artifact.path, 'utf8');
    return {
      status: 'found',
      artifact,
      job,
      content: JSON.parse(raw)
    };
  } catch {
    return { status: 'missing' };
  }
}

async function processJob(jobId: string) {
  const job = await getJob(jobId);
  if (!job || job.state !== 'queued') return;

  await updateJob(jobId, (current) => ({
    ...current,
    state: 'running',
    progress: 10,
    timestamps: {
      ...current.timestamps,
      startedAt: current.timestamps.startedAt ?? nowIso(),
      updatedAt: nowIso()
    }
  }));

  try {
    const response = await fetch(`${SCRAPER_SERVICE_URL}/jobs/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jobId,
        tool: job.tool,
        payload: job.payload
      })
    });

    if (!response.ok) {
      throw new Error(`scraper-service failed with status ${response.status}`);
    }

    const body = (await response.json()) as ExecuteResponse;
    const artifactRefs = body.artifacts ? await persistArtifacts(job, body.artifacts) : [];

    await updateJob(jobId, (current) => ({
      ...current,
      state: 'succeeded',
      progress: 100,
      execution: body.execution ?? current.execution,
      result: body.result,
      artifacts: artifactRefs,
      timestamps: {
        ...current.timestamps,
        updatedAt: nowIso(),
        completedAt: nowIso()
      }
    }));
  } catch (error) {
    await updateJob(jobId, (current) => ({
      ...current,
      state: 'failed',
      progress: current.progress > 90 ? current.progress : 90,
      error: toJobError(error),
      timestamps: {
        ...current.timestamps,
        updatedAt: nowIso(),
        completedAt: nowIso()
      }
    }));
  }
}

function jobAccessToEnvelope(job: StoredJobContract) {
  if (job.access?.scope === 'submitter') {
    return {
      scope: 'submitter',
      submitterBound: true
    };
  }

  if (job.retention.artifactAccess === 'authenticated') {
    return {
      scope: 'authenticated',
      submitterBound: false
    };
  }

  return {
    scope: 'public',
    submitterBound: false
  };
}

export function jobToEnvelope(job: StoredJobContract) {
  return {
    id: job.id,
    tool: job.tool,
    status: job.state,
    progress: job.progress,
    timestamps: job.timestamps,
    retention: job.retention,
    access: jobAccessToEnvelope(job),
    execution: job.execution ?? null,
    error: job.error ?? null,
    artifacts: job.artifacts,
    result: job.result ?? null,
    statusUrl: `/api/v1/jobs/${job.id}`
  };
}

export function isTerminalState(state: JobState) {
  return state === 'succeeded' || state === 'failed' || state === 'expired';
}
