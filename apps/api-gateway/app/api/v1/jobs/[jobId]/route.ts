import { NextResponse } from 'next/server';
import { createErrorResponse, createRequestId, createResponse, startTiming } from '@forensic/scraping-core';
import { getJob, jobToEnvelope } from '@/lib/jobs/runtime';

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const startTime = startTiming();
  const requestId = createRequestId();
  const { jobId } = await context.params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json(
      createErrorResponse(new Error(`job ${jobId} not found`), startTime, { requestId }),
      { status: 404, headers: { 'x-request-id': requestId } }
    );
  }

  return NextResponse.json(createResponse(jobToEnvelope(job), startTime, { requestId }), {
    headers: { 'x-request-id': requestId }
  });
}
