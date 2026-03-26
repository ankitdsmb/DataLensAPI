import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

// 3.4 Spotify Tracks Downloader
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { url } = await req.json();
    if (!url) throw new Error('url is required');

    // Simulate Spotify API extraction / external downloading service wrapper
    const response = await gotScraping.get(url, { headerGeneratorOptions: { browsers: ['chrome'] } });
    const match = response.body.match(/<meta property="og:title" content="([^"]+)"/);
    const title = match ? match[1] : "Unknown Track";

    return NextResponse.json({
      success: true,
      data: { track_url: url, title, download_link: "https://api.example-downloader.com/process?url=" + encodeURIComponent(url) },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
