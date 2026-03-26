import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

// 6.10 Vimeo Video Scraper
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { video_url } = await req.json();
    if (!video_url) throw new Error('video_url is required');

    const response = await gotScraping.get(video_url, { headerGeneratorOptions: { browsers: ['chrome'] } });

    const match = response.body.match(/window\.vimeo\.clip_page_config = ({.*?});/);
    let playerConfig = null;

    if (match) {
        try { playerConfig = JSON.parse(match[1]); } catch(e) {}
    }

    if (!playerConfig) throw new Error("Could not extract player config.");

    const clipData = playerConfig.clip;
    const authorData = playerConfig.owner;
    const statsData = clipData?.stats || {};

    return NextResponse.json({
      success: true,
      data: {
        video_url,
        title: clipData.title,
        duration: clipData.duration,
        author: {
           id: authorData.id,
           name: authorData.display_name,
           url: authorData.url
        },
        likes_count: statsData.likes,
        plays_count: statsData.plays
      },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
