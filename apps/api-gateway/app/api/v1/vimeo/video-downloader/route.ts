import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
// 3.5 Vimeo Video Downloader

export const POST = withScrapingHandler(async (req: Request) => {

    const { video_url } = await req.json();
    if (!video_url) throw new Error('video_url is required');

    const response = await stealthGet(video_url, { headerGeneratorOptions: { browsers: ['chrome'] } });

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
       const configResponse = await stealthGet(requestData);
       const configJson = JSON.parse(configResponse.body);
       if (configJson.request?.files?.progressive) {
           mp4_urls = configJson.request.files.progressive.map((file: any) => ({
              quality: file.quality,
              fps: file.fps,
              url: file.url
           }));
       }
    }

    return {
        video_url,
        title: clipData.title,
        duration: clipData.duration,
        available_formats: mp4_urls
      };


});
