import { NextResponse } from 'next/server';
import { createResponse, createErrorResponse, getJob } from '@forensic/scraping-core';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const rawId = (await params).id;

  if (!/^[a-zA-Z0-9_-]+$/.test(rawId)) {
    return NextResponse.json(createErrorResponse('Invalid Job ID format', startTime), { status: 400 });
  }

  const id = rawId;
  const job = getJob(id);

  if (!job) {
    const errorResponse = createErrorResponse('Job not found', startTime);
    if (errorResponse.error) {
       errorResponse.error.code = 'not_found';
    }
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const response = createResponse(null, startTime, { job });
  return NextResponse.json(response);
}
