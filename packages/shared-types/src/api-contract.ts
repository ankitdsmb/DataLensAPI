export type ApiWarning = {
  code: string;
  message: string;
};

export type ApiJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type ApiJob = {
  id: string;
  status: ApiJobStatus;
  status_url?: string | null;
  artifact_urls?: string[];
};

export type ApiPagination = {
  page?: number;
  page_size?: number;
  total_items?: number;
  next_cursor?: string | null;
};

export type ApiErrorShape = {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
};

export type ApiResponseMetadata = {
  request_id: string;
  timestamp: string;
  execution_time_ms: number;
  tool_version: string;
  source: 'datalens';
  warnings: ApiWarning[];
};

export type StandardResponse<T> = {
  success: boolean;
  data: T | null;
  metadata: ApiResponseMetadata;
  error: ApiErrorShape | null;
  job: ApiJob | null;
  pagination: ApiPagination | null;
};

export type ApiHandlerError = Error & {
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
};

export type ToolExecutionPolicy = {
  timeoutMs: number;
  maxPayloadBytes: number;
  maxUrlCount: number;
  anonymous: boolean;
  cacheTtlSeconds: number;
};
