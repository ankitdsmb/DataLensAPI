import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 6.4 Stepstone Job Scraper
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { keyword, radius_km = 50 } = await req.json();
    if (!keyword) throw new Error('keyword is required');

    // Searching Stepstone DE
    const url = `https://www.stepstone.de/jobs/${encodeURIComponent(keyword)}?radius=${radius_km}`;
    const response = await gotScraping.get(url, { headerGeneratorOptions: { browsers: ['chrome'] } });
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

    return NextResponse.json({
      success: true,
      data: { query: keyword, radius: radius_km, total_found: jobs.length, jobs },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
