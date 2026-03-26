import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

// 3.5 Vimeo Video Downloader
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { video_url } = await req.json();
    if (!video_url) throw new Error('video_url is required');

    const response = await gotScraping.get(video_url, { headerGeneratorOptions: { browsers: ['chrome'] } });

    // Vimeo player config is embedded in the HTML as a JSON string
    const match = response.body.match(/window\.vimeo\.clip_page_config = ({.*?});/);
    let playerConfig = null;

    if (match) {
        try {
            playerConfig = JSON.parse(match[1]);
        } catch(e) {}
    }

    if (!playerConfig) throw new Error("Could not extract player config. Video might be private.");

    const clipData = playerConfig.clip;
    const requestData = playerConfig.player?.config_url;

    // To get the actual .mp4 links, we usually need to fetch the config_url
    let mp4_urls = [];
    if (requestData) {
       const configResponse = await gotScraping.get(requestData);
       const configJson = JSON.parse(configResponse.body);
       if (configJson.request?.files?.progressive) {
           mp4_urls = configJson.request.files.progressive.map((file: any) => ({
              quality: file.quality,
              fps: file.fps,
              url: file.url
           }));
       }
    }

    return NextResponse.json({
      success: true,
      data: {
        video_url,
        title: clipData.title,
        duration: clipData.duration,
        available_formats: mp4_urls
      },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
