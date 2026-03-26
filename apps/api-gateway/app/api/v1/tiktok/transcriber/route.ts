import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 3.6 TikTok Video Transcriber
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { url } = await req.json();
    if (!url) throw new Error('url is required');

    const response = await gotScraping.get(url, { headerGeneratorOptions: { browsers: ['chrome'], os: ['windows'] } });
    const $ = cheerio.load(response.body);

    const scriptTagText = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').text();
    let hydrationData = null;

    if (scriptTagText) {
      try { hydrationData = JSON.parse(scriptTagText); } catch(e) {}
    }

    let subtitleData = null;

    if (hydrationData && hydrationData.__DEFAULT_SCOPE__ && hydrationData.__DEFAULT_SCOPE__['webapp.video-detail']) {
        const itemInfo = hydrationData.__DEFAULT_SCOPE__['webapp.video-detail'].itemInfo;
        const video = itemInfo?.itemStruct?.video;

        if (video && video.subtitleInfos && video.subtitleInfos.length > 0) {
            // Find the auto-generated or uploaded English transcript if available
            const englishSub = video.subtitleInfos.find((sub: any) => sub.LanguageCodeName === 'eng') || video.subtitleInfos[0];
            if (englishSub) subtitleData = {
               format: englishSub.Format,
               language: englishSub.LanguageCodeName,
               transcript_url: englishSub.Url
            };
        }
    }

    if (!subtitleData) throw new Error("No transcription or subtitles found for this video.");

    // Fetch the transcript content
    const subResponse = await gotScraping.get(subtitleData.transcript_url);

    return NextResponse.json({
      success: true,
      data: {
         url,
         language: subtitleData.language,
         transcript_content: subResponse.body.substring(0, 1000) + "\n... (truncated)"
      },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
