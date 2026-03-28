export type JobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'expired';

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
  result?: TResult;
  error?: JobError;
  artifacts: JobArtifactRef[];
};
