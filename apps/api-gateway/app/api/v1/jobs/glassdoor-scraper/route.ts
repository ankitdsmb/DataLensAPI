import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';

// 3.9 Glassdoor Scraper - Company Reviews

export const POST = withScrapingHandler(async (req: Request) => {

    const { company_id, type = "reviews", limit = 50 } = await req.json();
    if (!company_id) throw new Error('company_id is required');

    // Glassdoor requires account login and solves Cloudflare to view more than 1 page.
    return {
        company_id,
        type,
        limit,
        action: "Delegated to Heavyweight Service",
        status: "Requires authenticated headless session to bypass review walls."
      };


});
