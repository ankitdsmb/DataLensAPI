// SOLID Principle: Single Responsibility Principle
// This wrapper's only responsibility is standardizing the HTTP response format
// and execution timing, removing boilerplate try/catch from controllers.

// We simulate NextResponse for the core library so it works inside Next.js
// without strictly coupling the core library to the Next.js runtime.
// The actual implementation will use Next.js native NextResponse in the route.ts wrapper.

export type StandardResponse<T> = {
  success: boolean;
  data: T | null;
  metadata: {
    timestamp: string;
    execution_time_ms: number;
    job_id?: string;
  };
  error: string | null;
};

/**
 * Creates the standard JSON envelope required by the architecture.
 */
export function createResponse<T>(data: T, startTime: number): StandardResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime
    },
    error: null
  };
}

/**
 * Creates the standard error JSON envelope.
 */
export function createErrorResponse(error: Error | string, startTime: number): StandardResponse<null> {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    data: null,
    metadata: {
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime
    },
    error: message || 'Internal Server Error'
  };
}
