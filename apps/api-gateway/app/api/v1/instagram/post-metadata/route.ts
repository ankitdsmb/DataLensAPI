import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';

// 2.5 Instagram Post & Image Scraper

export const POST = withScrapingHandler(async (req: Request) => {

    const { urls, download_images = false } = await req.json();
    if (!urls || !Array.isArray(urls)) throw new Error('urls array is required');

    // Scraping Instagram Image grids cleanly often requires Playwright
    // Or extracting XIG properties that are heavily obfuscated.
    const renderInstanceUrl = process.env.RENDER_SERVICE_URL || "https://scraper-service.onrender.com";

    return {
        urls_received: urls.length,
        action: "Authentication Required. Delegated to Heavyweight Service",
        simulated_internal_proxy: `${renderInstanceUrl}/api/internal/ig-post`
      };


});
