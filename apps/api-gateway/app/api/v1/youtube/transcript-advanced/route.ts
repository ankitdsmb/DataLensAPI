import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
// 5.9 Youtube Transcript Scraper - Caption, Subtitles

export const POST = withScrapingHandler(async (req: Request) => {

    const { video_url, target_language = "en" } = await req.json();
    if (!video_url) throw new Error('video_url is required');

    const response = await stealthGet(video_url, { headerGeneratorOptions: { browsers: ['chrome'] } });

    // Find captionTracks array
    const match = response.body.match(/"captionTracks":\[(.*?)\]/);
    let captionsUrl = null;

    if (match) {
        try {
            const tracks = JSON.parse(`[${match[1]}]`);
            const targetTrack = tracks.find((t: any) => t.languageCode === target_language) || tracks[0];

            // Auto translation logic
            captionsUrl = targetTrack.baseUrl;
            if (targetTrack.languageCode !== target_language) {
               captionsUrl += `&tlang=${target_language}`;
            }
        } catch(e) {}
    }

    if (!captionsUrl) throw new Error("Captions not found for this video.");

    // Fetch the raw XML transcript
    const xmlResponse = await stealthGet(captionsUrl);

    // Quick regex conversion to SRT-like format
    const xmlText = xmlResponse.body;
    const textNodes = Array.from(xmlText.matchAll(/<text start="([\d.]+)" dur="([\d.]+)".*?>(.*?)<\/text>/g));

    const formatTime = (secondsStr: string) => {
        const totalSecs = parseFloat(secondsStr);
        const hours = Math.floor(totalSecs / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const secs = Math.floor(totalSecs % 60);
        const ms = Math.floor((totalSecs % 1) * 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };

    let srtData = "";
    textNodes.forEach((node, idx) => {
       const start = formatTime(node[1]);
       const end = formatTime((parseFloat(node[1]) + parseFloat(node[2])).toString());
       // Decode html entities simply
       const text = node[3].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
       srtData += `${idx + 1}\n${start} --> ${end}\n${text}\n\n`;
    });

    return { video_url, translated: target_language !== 'en', subtitles_srt: srtData.substring(0, 1000) + "\n... (truncated for preview)" };


});
