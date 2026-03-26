import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

// 2.6 Instagram Post Downloader
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { urls } = await req.json();
    if (!urls) throw new Error('urls array is required');

    const results = [];
    for (const url of urls) {
      // Very basic Instagram scraping without cookies is often blocked, but we simulate the extraction here using og:tags.
      const response = await gotScraping.get(url, { headerGeneratorOptions: { browsers: ['safari'], os: ['ios'] } });
      const videoMatch = response.body.match(/<meta property="og:video" content="([^"]+)"/);
      const imageMatch = response.body.match(/<meta property="og:image" content="([^"]+)"/);

      results.push({
         url,
         media_type: videoMatch ? 'video' : 'image',
         direct_url: (videoMatch ? videoMatch[1] : imageMatch ? imageMatch[1] : null) || "Blocked by login wall"
      });
    }

    return NextResponse.json({
      success: true,
      data: results,
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
