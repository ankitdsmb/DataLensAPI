import { NextResponse } from 'next/server';
import { createErrorResponse, createRequestId, createResponse } from './apiWrapper';
import { DEFAULT_TOOL_POLICY } from './policy';
import type { ToolExecutionPolicy } from '../../shared-types/src';
import { RequestValidationError } from './validation';
type ScrapingHandlerOptions = {
  policy?: Partial<ToolExecutionPolicy>;
};

type ResolvedScrapingHandlerOptions = {
  policy: ToolExecutionPolicy;
};

function resolveScrapingOptions(options?: ScrapingHandlerOptions): ResolvedScrapingHandlerOptions {
  return {
    policy: {
      ...DEFAULT_TOOL_POLICY,
      ...(options?.policy ?? {})
    }
  };
}

function resolveErrorStatus(error: unknown): number {
  if (error instanceof RequestValidationError) {
    return error.status;
  }

  if (error instanceof Error) {
    const status = (error as Error & { status?: unknown }).status;
    if (typeof status === 'number' && Number.isInteger(status)) {
      return status;
    }
  }

  return 500;
}

export function withScrapingHandler<T>(
  handler: (req: Request) => Promise<T>
): (req: Request) => Promise<NextResponse>;
export function withScrapingHandler(
  options: ScrapingHandlerOptions,
  handler: (req: Request) => Promise<unknown>
): (req: Request) => Promise<NextResponse>;
export function withScrapingHandler<T>(
  optionsOrHandler: ScrapingHandlerOptions | ((req: Request) => Promise<T>),
  maybeHandler?: (req: Request) => Promise<T>
) {
  const handler = typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler;
  const options = typeof optionsOrHandler === 'function' ? resolveScrapingOptions() : resolveScrapingOptions(optionsOrHandler);

  if (!handler) {
    throw new Error('withScrapingHandler requires a route handler');
  }

  return async function POST(req: Request) {
    const startTime = Date.now();
    const requestId = createRequestId();
    try {
      const contentLengthHeader = req.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = Number(contentLengthHeader);
        if (Number.isFinite(contentLength) && contentLength > options.policy.maxPayloadBytes) {
          throw new RequestValidationError('request body exceeds maximum payload size', {
            maxPayloadBytes: options.policy.maxPayloadBytes,
            contentLength
          });
        }
      }

      const data = await handler(req);
      const stdRes = createResponse(data, startTime, { requestId });
      return NextResponse.json(stdRes, {
        headers: {
          'x-request-id': requestId
        }
      });
    } catch (error) {
      const normalizedError =
        typeof error === 'string' || error instanceof Error
          ? error
          : new Error('Internal Server Error');
      const stdErr = createErrorResponse(normalizedError, startTime, { requestId });
      return NextResponse.json(stdErr, {
        status: resolveErrorStatus(error),
        headers: {
          'x-request-id': requestId
        }
      });
    }
  };
}
