import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

// 2.9 YouTube Transcript Downloader
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { video_url, language = "en" } = await req.json();
    if (!video_url) throw new Error('video_url is required');

    const response = await gotScraping.get(video_url, { headerGeneratorOptions: { browsers: ['chrome'] } });

    // YouTube embeds captions data in player_response
    const match = response.body.match(/"captionTracks":\[(.*?)\]/);
    let captionsUrl = null;

    if (match) {
        try {
            const tracks = JSON.parse(`[${match[1]}]`);
            const targetTrack = tracks.find((t: any) => t.languageCode === language) || tracks[0];
            captionsUrl = targetTrack ? targetTrack.baseUrl : null;
        } catch(e) {}
    }

    let transcript = "Not available or requires JS hydration";
    if (captionsUrl) {
        // Fetch the raw XML transcript
        const xmlResponse = await gotScraping.get(captionsUrl);
        // Extremely simple parsing. A real implementation uses cheerio to parse XML and output VTT/SRT.
        transcript = xmlResponse.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    return NextResponse.json({
      success: true,
      data: { video_url, transcript_preview: transcript.substring(0, 500) + "..." },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
