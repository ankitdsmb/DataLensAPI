import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  JobArtifactRef,
  JobContract,
  JobError,
  JobExecutionMetadata,
  JobState
} from '@forensic/shared-types';

const DATA_ROOT = path.join(process.cwd(), '.data', 'jobs');
const JOBS_FILE = path.join(DATA_ROOT, 'jobs.json');
const ARTIFACT_ROOT = path.join(DATA_ROOT, 'artifacts');
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL ?? 'http://localhost:3000';

type JobsDb = { jobs: Record<string, JobContract> };

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

function markExpired(job: JobContract): JobContract {
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

export async function submitJob(tool: string, payload: Record<string, unknown>) {
  const queuedAt = nowIso();
  const job: JobContract = {
    id: createJobId(),
    tool,
    state: 'queued',
    payload,
    progress: 0,
    timestamps: {
      queuedAt,
      updatedAt: queuedAt,
      expiresAt: new Date(Date.now() + DEFAULT_TTL_MS).toISOString()
    },
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

export async function getJob(jobId: string): Promise<JobContract | null> {
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

async function updateJob(jobId: string, updater: (current: JobContract) => JobContract | null) {
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

async function persistArtifacts(jobId: string, artifacts: NonNullable<ExecuteResponse['artifacts']>) {
  const refs: JobArtifactRef[] = [];

  for (let index = 0; index < artifacts.length; index += 1) {
    const artifact = artifacts[index];
    const artifactId = artifact.id?.trim() || `artifact_${index + 1}`;
    const filePath = path.join(ARTIFACT_ROOT, `${jobId}-${artifactId}.json`);
    await writeFile(filePath, JSON.stringify(artifact.content, null, 2), 'utf8');

    refs.push({
      id: artifactId,
      type: artifact.type ?? 'json',
      title: artifact.title ?? `${artifactId} output`,
      path: filePath,
      url: `/api/v1/jobs/${jobId}/artifacts/${artifactId}`,
      createdAt: nowIso()
    });
  }

  return refs;
}

export async function getArtifactContent(jobId: string, artifactId: string): Promise<unknown | null> {
  const artifactPath = path.join(ARTIFACT_ROOT, `${jobId}-${artifactId}.json`);
  try {
    const raw = await readFile(artifactPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
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
    const artifactRefs = body.artifacts ? await persistArtifacts(jobId, body.artifacts) : [];

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

export function jobToEnvelope(job: JobContract) {
  return {
    id: job.id,
    tool: job.tool,
    status: job.state,
    progress: job.progress,
    timestamps: job.timestamps,
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
