import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
// 2.6 Instagram Post Downloader

export const POST = withScrapingHandler(async (req: Request) => {

    const { urls } = await req.json();
    if (!urls) throw new Error('urls array is required');

    const results = [];
    for (const url of urls) {
      // Very basic Instagram scraping without cookies is often blocked, but we simulate the extraction here using og:tags.
      const response = await stealthGet(url, { headerGeneratorOptions: { browsers: ['safari'], os: ['ios'] } });
      const videoMatch = response.body.match(/<meta property="og:video" content="([^"]+)"/);
      const imageMatch = response.body.match(/<meta property="og:image" content="([^"]+)"/);

      results.push({
         url,
         media_type: videoMatch ? 'video' : 'image',
         direct_url: (videoMatch ? videoMatch[1] : imageMatch ? imageMatch[1] : null) || "Blocked by login wall"
      });
    }

    return results;


});
