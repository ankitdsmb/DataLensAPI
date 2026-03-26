import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
// 3.2 YouTube Video Formats Scraper

export const POST = withScrapingHandler(async (req: Request) => {

    const { url } = await req.json();
    if (!url) throw new Error('url is required');

    const response = await stealthGet(url, { headerGeneratorOptions: { browsers: ['chrome'] } });

    // YouTube embeds video formats inside the streamingData object
    const match = response.body.match(/"streamingData":(\{.*?\})/);
    let formatsData = null;

    if (match) {
        try {
            formatsData = JSON.parse(match[1]);
        } catch(e) {}
    }

    if (!formatsData) throw new Error("Could not extract formats. Video might be restricted.");

    const formats = formatsData.formats || [];
    const adaptiveFormats = formatsData.adaptiveFormats || [];

    // Decrypting signatures is complex and requires full ytdl-core logic.
    // This API returns the raw available formats.
    const extractFormatInfo = (formatList: any[]) => {
       return formatList.map(f => ({
          itag: f.itag,
          url: f.url ? "Available (No Signature Cipher)" : "Requires Signature Decryption",
          mimeType: f.mimeType,
          quality: f.qualityLabel || f.quality,
          bitrate: f.bitrate,
          audioQuality: f.audioQuality
       }));
    };

    return {
        video_url: url,
        combined_formats: extractFormatInfo(formats),
        adaptive_formats: extractFormatInfo(adaptiveFormats)
      };


});
