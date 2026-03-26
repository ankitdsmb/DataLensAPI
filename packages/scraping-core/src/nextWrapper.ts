import { NextResponse } from 'next/server';
import { createResponse, createErrorResponse } from './apiWrapper';

/**
 * Higher Order Function to wrap Next.js API Route handlers.
 * It enforces the try/catch logic, timing, and standardized NextResponse formatting.
 *
 * SOLID: Open-Closed Principle - we can extend the wrapper's logging/tracking
 * without modifying the actual scraping route logic.
 */
export function withScrapingHandler(handler: (req: Request) => Promise<any>) {
  return async function POST(req: Request) {
    const startTime = Date.now();
    try {
      const data = await handler(req);
      const stdRes = createResponse(data, startTime);
      return NextResponse.json(stdRes);
    } catch (error: any) {
      const stdErr = createErrorResponse(error, startTime);
      return NextResponse.json(stdErr, { status: error.status || 400 });
    }
  };
}
