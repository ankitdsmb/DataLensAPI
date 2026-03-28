import { NextResponse } from 'next/server';
import { createErrorResponse, createRequestId, createResponse } from '@forensic/scraping-core';
import { getArtifactContent } from '@/lib/jobs/runtime';

type RouteContext = {
  params: Promise<{ jobId: string; artifactId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const startTime = Date.now();
  const requestId = createRequestId();
  const { jobId, artifactId } = await context.params;
  const artifact = await getArtifactContent(jobId, artifactId);

  if (!artifact) {
    return NextResponse.json(
      createErrorResponse(new Error(`artifact ${artifactId} not found for job ${jobId}`), startTime, {
        requestId
      }),
      { status: 404, headers: { 'x-request-id': requestId } }
    );
  }

  return NextResponse.json(createResponse({ jobId, artifactId, artifact }, startTime, { requestId }), {
    headers: { 'x-request-id': requestId }
  });
}
