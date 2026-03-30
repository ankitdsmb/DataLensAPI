import { NextResponse } from 'next/server';
import {
  RequestValidationError,
  createErrorResponse,
  createRequestId,
  createResponse,
  startTiming
} from '@forensic/scraping-core';
import { assertJobReadAccess, getJob, jobToEnvelope } from '@/lib/jobs/runtime';

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  const startTime = startTiming();
  const requestId = createRequestId();
  try {
    const { jobId } = await context.params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        createErrorResponse(new Error(`job ${jobId} not found`), startTime, { requestId }),
        { status: 404, headers: { 'x-request-id': requestId } }
      );
    }

    assertJobReadAccess(req, job);

    return NextResponse.json(createResponse(jobToEnvelope(job), startTime, { requestId }), {
      headers: { 'x-request-id': requestId }
    });
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('Internal Server Error');
    const status = normalized instanceof RequestValidationError ? normalized.status : 500;
    return NextResponse.json(createErrorResponse(normalized, startTime, { requestId }), {
      status,
      headers: { 'x-request-id': requestId }
    });
  }
}
