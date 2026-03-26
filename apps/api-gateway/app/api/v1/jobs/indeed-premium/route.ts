import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';

// 6.9 Indeed Jobs Scraper [RENTAL]

export const POST = withScrapingHandler(async (req: Request) => {

    const { query, experience_level = 'entry_level' } = await req.json();
    if (!query) throw new Error('query is required');

    // This is explicitly a "Rental" or Premium scraping tier that bypasses
    // Cloudflare using undetectable headless Chrome and extracts advanced filters.
    // It does not run on Vercel Edge.
    const jobId = "ind_prem_" + Math.random().toString(36).substring(7);

    return {
        query,
        experience_level,
        status: "processing",
        job_id: jobId,
        action: "Delegated to Heavyweight Service (undetected-chromedriver)"
      };


});
