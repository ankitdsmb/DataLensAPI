import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
// 6.10 Vimeo Video Scraper

export const POST = withScrapingHandler(async (req: Request) => {

    const { video_url } = await req.json();
    if (!video_url) throw new Error('video_url is required');

    const response = await stealthGet(video_url, { headerGeneratorOptions: { browsers: ['chrome'] } });

    const match = response.body.match(/window\.vimeo\.clip_page_config = ({.*?});/);
    let playerConfig = null;

    if (match) {
        try { playerConfig = JSON.parse(match[1]); } catch(e) {}
    }

    if (!playerConfig) throw new Error("Could not extract player config.");

    const clipData = playerConfig.clip;
    const authorData = playerConfig.owner;
    const statsData = clipData?.stats || {};

    return {
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
      };


});
