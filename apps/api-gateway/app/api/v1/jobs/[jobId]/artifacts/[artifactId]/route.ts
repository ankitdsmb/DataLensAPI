import { NextResponse } from 'next/server';
import {
  RequestValidationError,
  createErrorResponse,
  createRequestId,
  createResponse,
  startTiming
} from '@forensic/scraping-core';
import { assertJobReadAccess, getArtifactRecord } from '@/lib/jobs/runtime';

type RouteContext = {
  params: Promise<{ jobId: string; artifactId: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  const startTime = startTiming();
  const requestId = createRequestId();
  try {
    const { jobId, artifactId } = await context.params;
    const artifactRecord = await getArtifactRecord(jobId, artifactId);

    if (artifactRecord.status === 'missing') {
      return NextResponse.json(
        createErrorResponse(new Error(`artifact ${artifactId} not found for job ${jobId}`), startTime, {
          requestId
        }),
        { status: 404, headers: { 'x-request-id': requestId } }
      );
    }

    assertJobReadAccess(req, artifactRecord.job);

    if (artifactRecord.status === 'expired') {
      const expiredError = new RequestValidationError('artifact has expired for this preview job', {
        jobId,
        artifactId,
        expiresAt: artifactRecord.artifact.expiresAt
      });
      expiredError.status = 410;
      expiredError.code = 'artifact_expired';
      throw expiredError;
    }

    return NextResponse.json(
      createResponse(
        {
          jobId,
          artifactId,
          artifact: artifactRecord.content,
          metadata: {
            createdAt: artifactRecord.artifact.createdAt,
            expiresAt: artifactRecord.artifact.expiresAt,
            type: artifactRecord.artifact.type,
            title: artifactRecord.artifact.title
          }
        },
        startTime,
        { requestId }
      ),
      {
        headers: { 'x-request-id': requestId }
      }
    );
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('Internal Server Error');
    const status = normalized instanceof RequestValidationError ? normalized.status : 500;
    return NextResponse.json(createErrorResponse(normalized, startTime, { requestId }), {
      status,
      headers: { 'x-request-id': requestId }
    });
  }
}
