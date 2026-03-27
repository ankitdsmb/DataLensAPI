import type {
  ApiErrorShape,
  ApiHandlerError,
  ApiJob,
  ApiPagination,
  ApiResponseMetadata,
  ApiWarning,
  StandardResponse
} from '../../shared-types/src';

const DEFAULT_TOOL_VERSION = '1.0.0';

export type ResponseEnvelopeOptions = {
  requestId?: string;
  toolVersion?: string;
  warnings?: ApiWarning[];
  job?: ApiJob | null;
  pagination?: ApiPagination | null;
};

function buildMetadata(startTime: number, options: ResponseEnvelopeOptions): ApiResponseMetadata {
  return {
    request_id: options.requestId ?? createRequestId(),
    timestamp: new Date().toISOString(),
    execution_time_ms: Date.now() - startTime,
    tool_version: options.toolVersion ?? DEFAULT_TOOL_VERSION,
    source: 'datalens',
    warnings: options.warnings ?? []
  };
}

function toErrorShape(error: Error | string): ApiErrorShape {
  if (typeof error === 'string') {
    return {
      code: 'bad_request',
      message: error,
      details: null
    };
  }

  const shapedError = error as ApiHandlerError;

  return {
    code: shapedError.code ?? inferErrorCode(shapedError.status),
    message: shapedError.message || 'Internal Server Error',
    details: shapedError.details ?? null
  };
}

function inferErrorCode(status?: number) {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 408) return 'timeout';
  if (status === 429) return 'rate_limited';
  if (status && status >= 500) return 'internal_error';
  return 'bad_request';
}

export function createRequestId() {
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Creates the standard JSON envelope required by the architecture.
 */
export function createResponse<T>(
  data: T,
  startTime: number,
  options: ResponseEnvelopeOptions = {}
): StandardResponse<T> {
  return {
    success: true,
    data,
    metadata: buildMetadata(startTime, options),
    error: null,
    job: options.job ?? null,
    pagination: options.pagination ?? null
  };
}

/**
 * Creates the standard error JSON envelope.
 */
export function createErrorResponse(
  error: Error | string,
  startTime: number,
  options: ResponseEnvelopeOptions = {}
): StandardResponse<null> {
  return {
    success: false,
    data: null,
    metadata: buildMetadata(startTime, options),
    error: toErrorShape(error),
    job: null,
    pagination: null
  };
}
