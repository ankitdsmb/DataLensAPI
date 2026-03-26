import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// 6.2 Fast Indeed Job Scraper

export const POST = withScrapingHandler(async (req: Request) => {

    const { direct_url } = await req.json();
    if (!direct_url) throw new Error('direct_url is required (e.g., https://www.indeed.com/jobs?q=python)');

    // Indeed blocks AWS IPs instantly. A datacenter proxy is required in production.
    const response = await stealthGet(direct_url, { headerGeneratorOptions: { browsers: ['chrome'] } });
    const $ = cheerio.load(response.body);

    const jobs: any[] = [];
    $('div.job_seen_beacon').each((_, el) => {
       const title = $(el).find('h2.jobTitle span[title]').text().trim();
       const company = $(el).find('[data-testid="company-name"]').text().trim();
       const location = $(el).find('[data-testid="text-location"]').text().trim();
       const salary = $(el).find('div.metadataContainer div.salary-snippet-container').text().trim() || null;
       const jk = $(el).find('h2.jobTitle a').attr('data-jk');
       const link = jk ? `https://www.indeed.com/viewjob?jk=${jk}` : null;

       if (title && link) {
          jobs.push({ title, company, location, salary_estimate: salary, apply_link: link });
       }
    });

    if (jobs.length === 0 && response.statusCode === 403) {
       throw new Error("Indeed blocked this request (403). Ensure residential proxies are configured.");
    }

    return { url: direct_url, results_count: jobs.length, jobs };


});
