import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';


export const POST = withScrapingHandler(async (req: Request) => {

    const body = await req.json();
    const { url, internal_only } = body;

    if (!url) throw new Error('url is required');

    const response = await stealthGet(url);
    const $ = cheerio.load(response.body);

    const baseUrl = new URL(url);
    const links: any[] = [];

    $('a').each((_, element) => {
      let href = $(element).attr('href');
      let text = $(element).text().trim();

      if (href && href.length > 0 && !href.startsWith('javascript:')) {
        try {
          // Resolve relative URLs
          const fullUrl = new URL(href, url);

          if (internal_only && fullUrl.origin !== baseUrl.origin) {
            return; // Skip external links
          }

          links.push({
            href: fullUrl.href,
            text,
            is_internal: fullUrl.origin === baseUrl.origin
          });
        } catch (e) {
          // Invalid URL format
        }
      }
    });

    return {
        target: url,
        total_extracted: links.length,
        links
      };



});
