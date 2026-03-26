import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
// 3.3 YouTube Captions Scraper

export const POST = withScrapingHandler(async (req: Request) => {

    const { video_url } = await req.json();
    if (!video_url) throw new Error('video_url is required');

    const response = await stealthGet(video_url, { headerGeneratorOptions: { browsers: ['chrome'] } });

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

    return { video_url, available_captions: captions };


});
