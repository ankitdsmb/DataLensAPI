import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 6.3 LinkedIn Job Scraper (Lightweight)
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { job_title_query, location = 'Worldwide' } = await req.json();
    if (!job_title_query) throw new Error('job_title_query is required');

    // LinkedIn public jobs directory search URL
    const encodedQuery = encodeURIComponent(job_title_query);
    const encodedLocation = encodeURIComponent(location);
    const url = `https://www.linkedin.com/jobs/search?keywords=${encodedQuery}&location=${encodedLocation}`;

    const response = await gotScraping.get(url, { headerGeneratorOptions: { browsers: ['chrome'] } });
    const $ = cheerio.load(response.body);

    const jobs: any[] = [];
    $('.base-card').each((_, el) => {
       const title = $(el).find('h3.base-search-card__title').text().trim();
       const company = $(el).find('h4.base-search-card__subtitle a').text().trim() || $(el).find('h4.base-search-card__subtitle').text().trim();
       const jobLocation = $(el).find('span.job-search-card__location').text().trim();
       const jobUrl = $(el).find('a.base-card__full-link').attr('href');

       if (title && jobUrl) {
          jobs.push({ title, company, location: jobLocation, url: jobUrl.split('?')[0] });
       }
    });

    return NextResponse.json({
      success: true,
      data: { query: job_title_query, location, total_found: jobs.length, jobs },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
