import { NextResponse } from 'next/server';
import { createErrorResponse, createRequestId, createResponse } from './apiWrapper';
import { DEFAULT_TOOL_POLICY } from './policy';
import type { ToolExecutionPolicy } from '../../shared-types/src';
import { RequestValidationError, UpstreamApiError } from './validation';
import { acquireConcurrencyLease, enforceLaunchPolicy, resolveLaunchPolicy } from './launchGuard';
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
    let releaseConcurrency: (() => void) | undefined;
    try {
      const routePolicy = resolveLaunchPolicy(req, options.policy);
      enforceLaunchPolicy(req, routePolicy);
      releaseConcurrency = acquireConcurrencyLease(req, routePolicy);

      const contentLengthHeader = req.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = Number(contentLengthHeader);
        if (Number.isFinite(contentLength) && contentLength > routePolicy.maxPayloadBytes) {
          throw new RequestValidationError('request body exceeds maximum payload size', {
            maxPayloadBytes: routePolicy.maxPayloadBytes,
            contentLength
          });
        }
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new UpstreamApiError('request exceeded route timeout', 408, {
              timeoutMs: routePolicy.timeoutMs
            })
          );
        }, routePolicy.timeoutMs);
      });

      const data = await Promise.race([handler(req), timeoutPromise]);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const stdRes = createResponse(data, startTime, { requestId });
      return NextResponse.json(stdRes, {
        headers: {
          'x-request-id': requestId
        }
      });
    } catch (error: unknown) {
      let normalizedError =
        typeof error === 'string'
          ? new Error(error)
          : error instanceof Error
          ? error
          : new Error('Internal Server Error');

      if (
        normalizedError &&
        typeof normalizedError === 'object' &&
        'name' in normalizedError &&
        normalizedError.name === 'HTTPError' &&
        'response' in normalizedError &&
        typeof normalizedError.response === 'object' &&
        normalizedError.response !== null &&
        'statusCode' in normalizedError.response
      ) {
         const status = Number(normalizedError.response.statusCode);
         const optionsUrl = 'options' in normalizedError && typeof normalizedError.options === 'object' && normalizedError.options !== null && 'url' in normalizedError.options ? String(normalizedError.options.url) : undefined;
         normalizedError = new UpstreamApiError(
            `Upstream API failed with status ${status}`,
            status,
            { url: optionsUrl }
         );
      }

      const stdErr = createErrorResponse(normalizedError, startTime, { requestId });
      return NextResponse.json(stdErr, {
        status: resolveErrorStatus(normalizedError),
        headers: {
          'x-request-id': requestId
        }
      });
    } finally {
      releaseConcurrency?.();
    }
  };
}
