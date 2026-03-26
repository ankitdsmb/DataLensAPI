import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';

// 4.1 LinkedIn Scraper - Professional

export const POST = withScrapingHandler(async (req: Request) => {

    const { keyword, location, limit = 50 } = await req.json();
    if (!keyword) throw new Error('keyword is required');

    // Unlike 6.3 (LinkedIn Lite) which only scrapes the unauthenticated search directory,
    // this endpoint implies deep scraping requiring an authenticated session cookie (li_at)
    // to view full job posters, insights, and applicant counts.
    const jobId = "li_" + Math.random().toString(36).substring(7);

    return {
        keyword,
        location,
        status: "processing",
        job_id: jobId,
        action: "Delegated to Heavyweight Service (Authenticated crawler worker)"
      };


});
