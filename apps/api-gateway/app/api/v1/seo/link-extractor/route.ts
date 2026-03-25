import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { url, internal_only } = body;

    if (!url) throw new Error('url is required');

    const response = await gotScraping.get(url);
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

    return NextResponse.json({
      success: true,
      data: {
        target: url,
        total_extracted: links.length,
        links
      },
      metadata: {
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime
      },
      error: null
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      data: null,
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
