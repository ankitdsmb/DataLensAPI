import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
// 3.4 Spotify Tracks Downloader

export const POST = withScrapingHandler(async (req: Request) => {

    const { url } = await req.json();
    if (!url) throw new Error('url is required');

    // Simulate Spotify API extraction / external downloading service wrapper
    const response = await stealthGet(url, { headerGeneratorOptions: { browsers: ['chrome'] } });
    const match = response.body.match(/<meta property="og:title" content="([^"]+)"/);
    const title = match ? match[1] : "Unknown Track";

    return { track_url: url, title, download_link: "https://api.example-downloader.com/process?url=" + encodeURIComponent(url) };


});
