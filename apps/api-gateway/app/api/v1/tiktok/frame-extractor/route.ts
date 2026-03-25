import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 4.8 TikTok Frame Extractor
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { video_url } = body;

    if (!video_url) throw new Error('video_url is required');

    // Make an HTTP request spoofing a desktop browser
    const response = await gotScraping.get(video_url, {
      headerGeneratorOptions: {
         browsers: ['chrome'],
         os: ['windows']
      }
    });

    const $ = cheerio.load(response.body);

    // TikTok stores initial state in a JSON object inside a script tag
    // We look for __UNIVERSAL_DATA_FOR_REHYDRATION__ or SIGI_STATE
    const scriptTagText = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').text();
    let hydrationData = null;

    if (scriptTagText) {
      try {
         hydrationData = JSON.parse(scriptTagText);
      } catch(e) {}
    }

    // Default extraction fallback using meta tags if JSON is missing
    const ogImage = $('meta[property="og:image"]').attr('content');
    const title = $('meta[property="og:title"]').attr('content');

    let videoData = null;

    // Advanced Extraction
    if (hydrationData && hydrationData.__DEFAULT_SCOPE__ && hydrationData.__DEFAULT_SCOPE__['webapp.video-detail']) {
        const itemInfo = hydrationData.__DEFAULT_SCOPE__['webapp.video-detail'].itemInfo;
        if (itemInfo && itemInfo.itemStruct && itemInfo.itemStruct.video) {
           videoData = {
              cover: itemInfo.itemStruct.video.cover,
              originCover: itemInfo.itemStruct.video.originCover,
              dynamicCover: itemInfo.itemStruct.video.dynamicCover
           };
        }
    }

    // Prepare response object
    const thumbnails = videoData ? {
        default: videoData.cover,
        original: videoData.originCover,
        animated: videoData.dynamicCover
    } : { default: ogImage, original: null, animated: null };

    return NextResponse.json({
      success: true,
      data: {
        video_url,
        title,
        thumbnails
      },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      data: null,
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
