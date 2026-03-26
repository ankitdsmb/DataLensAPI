import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// 5.10 Czech News Scraper

export const POST = withScrapingHandler(async (req: Request) => {

    const body = await req.json();
    const { site, limit_articles = 10 } = body;

    if (!site) throw new Error('site is required (e.g., novinky.cz, idnes.cz).');

    // Simulate scraping Novinky RSS for this example
    let targetUrl = `https://www.novinky.cz/rss`;
    if (site.includes('idnes')) targetUrl = `https://servis.idnes.cz/rss.aspx`;

    const response = await stealthGet(targetUrl);

    // Parse XML using Cheerio with xmlMode
    const $ = cheerio.load(response.body, { xmlMode: true });

    const articles: any[] = [];

    $('item').slice(0, limit_articles).each((_, el) => {
      const title = $(el).find('title').text();
      const link = $(el).find('link').text();
      const description = $(el).find('description').text();
      const pubDate = $(el).find('pubDate').text();

      articles.push({
        headline: title,
        url: link,
        summary: description.replace(/<[^>]*>?/gm, '').trim(), // Strip basic HTML tags from summary
        published_at: pubDate
      });
    });

    return {
        site,
        total_extracted: articles.length,
        articles
      };



});
