import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';

// 2.8 TeraBox Video Downloader

export const POST = withScrapingHandler(async (req: Request) => {

    const { url, format = "mp3" } = await req.json();
    if (!url) throw new Error('url is required');

    // TeraBox requires a logged-in headless browser to bypass the "Download App" walls
    // and retrieve the direct CDN video token.
    return {
        url,
        format,
        action: "Delegated to Heavyweight Service",
        status: "Requires Render instance for TeraBox auth token generation"
      };


});
