import { NextResponse } from 'next/server';
import { createErrorResponse, createRequestId, createResponse } from './apiWrapper';
import { DEFAULT_TOOL_POLICY } from './policy';
import type { ToolExecutionPolicy } from '../../shared-types/src';
import { RequestValidationError } from './validation';

/**
 * Higher Order Function to wrap Next.js API Route handlers.
 * It enforces the try/catch logic, timing, and standardized NextResponse formatting.
 *
 * SOLID: Open-Closed Principle - we can extend the wrapper's logging/tracking
 * without modifying the actual scraping route logic.
 */
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

export function withScrapingHandler(handler: (req: Request) => Promise<any>): (req: Request) => Promise<NextResponse>;
export function withScrapingHandler(
  options: ScrapingHandlerOptions,
  handler: (req: Request) => Promise<any>
): (req: Request) => Promise<NextResponse>;
export function withScrapingHandler(
  optionsOrHandler: ScrapingHandlerOptions | ((req: Request) => Promise<any>),
  maybeHandler?: (req: Request) => Promise<any>
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
    } catch (error: any) {
      const stdErr = createErrorResponse(error, startTime, { requestId });
      return NextResponse.json(stdErr, {
        status: error.status || 400,
        headers: {
          'x-request-id': requestId
        }
      });
    }
  };
}
