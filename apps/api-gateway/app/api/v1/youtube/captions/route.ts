import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

// 3.3 YouTube Captions Scraper
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { video_url } = await req.json();
    if (!video_url) throw new Error('video_url is required');

    const response = await gotScraping.get(video_url, { headerGeneratorOptions: { browsers: ['chrome'] } });

    // YouTube embeds captions data in player_response
    const match = response.body.match(/"captionTracks":\[(.*?)\]/);
    let captions = [];

    if (match) {
        try {
            const tracks = JSON.parse(`[${match[1]}]`);
            captions = tracks.map((t: any) => ({
               baseUrl: t.baseUrl,
               name: t.name.simpleText,
               vssId: t.vssId,
               languageCode: t.languageCode,
               kind: t.kind || 'standard',
               isTranslatable: t.isTranslatable
            }));
        } catch(e) {}
    }

    if (captions.length === 0) throw new Error("No captions found for this video");

    return NextResponse.json({
      success: true,
      data: { video_url, available_captions: captions },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
