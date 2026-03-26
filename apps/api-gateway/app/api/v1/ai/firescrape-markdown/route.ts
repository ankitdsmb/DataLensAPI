import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

import TurndownService from 'turndown';

// 5.6 FireScrape AI Website Content Markdown Scraper (Lightweight version)

export const POST = withScrapingHandler(async (req: Request) => {

    const { url } = await req.json();
    if (!url) throw new Error('url is required');

    const response = await stealthGet(url, { headerGeneratorOptions: { browsers: ['chrome'] } });
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

    return {
        source_url: url,
        markdown: markdown,
        char_count: markdown.length
      };


});
