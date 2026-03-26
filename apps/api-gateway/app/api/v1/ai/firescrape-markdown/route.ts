import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

import TurndownService from 'turndown';

// 5.6 FireScrape AI Website Content Markdown Scraper (Lightweight version)
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { url } = await req.json();
    if (!url) throw new Error('url is required');

    const response = await gotScraping.get(url, { headerGeneratorOptions: { browsers: ['chrome'] } });
    const $ = cheerio.load(response.body);

    // Remove noise before conversion
    $('script, style, noscript, nav, header, footer, iframe, form, .ad, .sidebar, #menu').remove();

    // Attempt to isolate main content (similar to basic Readability logic)
    let mainHtml = $('article, main, #content, .content, .post').html();
    if (!mainHtml) {
        // Fallback to body if no semantic tags found
        mainHtml = $('body').html() || '';
    }

    // Convert to Markdown
    const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    const markdown = turndownService.turndown(mainHtml);

    return NextResponse.json({
      success: true,
      data: {
        source_url: url,
        markdown: markdown,
        char_count: markdown.length
      },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
