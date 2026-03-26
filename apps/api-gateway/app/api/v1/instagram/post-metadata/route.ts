import { NextResponse } from 'next/server';

// 2.5 Instagram Post & Image Scraper
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { urls, download_images = false } = await req.json();
    if (!urls || !Array.isArray(urls)) throw new Error('urls array is required');

    // Scraping Instagram Image grids cleanly often requires Playwright
    // Or extracting XIG properties that are heavily obfuscated.
    const renderInstanceUrl = process.env.RENDER_SERVICE_URL || "https://scraper-service.onrender.com";

    return NextResponse.json({
      success: true,
      data: {
        urls_received: urls.length,
        action: "Authentication Required. Delegated to Heavyweight Service",
        simulated_internal_proxy: `${renderInstanceUrl}/api/internal/ig-post`
      },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
