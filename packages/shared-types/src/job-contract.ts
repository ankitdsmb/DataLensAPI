export type JobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'expired';

export type JobExecutionMode = 'provider' | 'browser' | 'simulated' | 'projection' | 'template';

export type JobExecutionProvenance = {
  provider?: string | null;
  strategy?: string | null;
  attemptedStrategies?: string[] | null;
  attemptCount?: number | null;
  degraded?: boolean | null;
};

export type JobExecutionMetadata = {
  mode: JobExecutionMode;
  readyForPublicLaunch: boolean;
  notes?: string | null;
  provenance?: JobExecutionProvenance | null;
};

export type JobArtifactAccess = 'public' | 'authenticated';

export type JobRetentionPolicy = {
  jobTtlSeconds: number;
  artifactTtlSeconds: number;
  artifactAccess: JobArtifactAccess;
};

export type JobError = {
  code: string;
  message: string;
  retriable: boolean;
  details?: Record<string, unknown> | null;
};

export type JobArtifactRef = {
  id: string;
  type: 'report' | 'screenshot' | 'pdf' | 'json';
  title: string;
  path: string;
  url: string;
  createdAt: string;
  expiresAt: string;
};

export type JobTimestamps = {
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  expiresAt: string;
};

export type JobContract<TPayload = Record<string, unknown>, TResult = Record<string, unknown>> = {
  id: string;
  tool: string;
  state: JobState;
  payload: TPayload;
  progress: number;
  timestamps: JobTimestamps;
  retention: JobRetentionPolicy;
  execution?: JobExecutionMetadata;
  result?: TResult;
  error?: JobError;
  artifacts: JobArtifactRef[];
};
