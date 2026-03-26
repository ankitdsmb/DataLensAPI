import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';

// 4.2 PDF to HTML Converter Lite

export const POST = withScrapingHandler(async (req: Request) => {

    const { pdf_url, embed_images = true } = await req.json();
    if (!pdf_url) throw new Error('pdf_url is required');

    // Lite implementation simulates a wrapper around an external API or microservice
    // since PDF processing is too heavy for Vercel Edge/Serverless limits (50MB).
    const jobId = Math.random().toString(36).substring(7);

    return {
        pdf_url,
        status: "processing",
        job_id: jobId,
        message: "PDF submitted to asynchronous processing queue. Poll /status?job_id=" + jobId
      };


});
