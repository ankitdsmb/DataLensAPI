import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// 6.4 Stepstone Job Scraper

export const POST = withScrapingHandler(async (req: Request) => {

    const { keyword, radius_km = 50 } = await req.json();
    if (!keyword) throw new Error('keyword is required');

    // Searching Stepstone DE
    const url = `https://www.stepstone.de/jobs/${encodeURIComponent(keyword)}?radius=${radius_km}`;
    const response = await stealthGet(url, { headerGeneratorOptions: { browsers: ['chrome'] } });
    const $ = cheerio.load(response.body);

    const jobs: any[] = [];

    // Stepstone often embeds its structured data in JSON-LD or standard data attributes
    const jsonLdScripts = $('script[type="application/ld+json"]');

    jsonLdScripts.each((_, script) => {
        try {
            const json = JSON.parse($(script).html() || '{}');
            const schemas = Array.isArray(json) ? json : [json];

            for (const schema of schemas) {
               if (schema['@type'] === 'JobPosting' || schema['@type']?.includes('JobPosting')) {
                  jobs.push({
                      title: schema.title,
                      company_name: schema.hiringOrganization?.name,
                      city: schema.jobLocation?.address?.addressLocality,
                      employment_type: schema.employmentType,
                      date_posted: schema.datePosted
                  });
               }
            }
        } catch(e) {}
    });

    return { query: keyword, radius: radius_km, total_found: jobs.length, jobs };


});
