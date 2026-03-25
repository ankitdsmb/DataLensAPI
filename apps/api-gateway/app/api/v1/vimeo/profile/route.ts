import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) throw new Error('urls array is required');

    const results = [];

    for (const url of urls) {
      try {
        const response = await gotScraping.get(url);
        const $ = cheerio.load(response.body);

        // Try finding JSON-LD first
        const jsonLdScripts = $('script[type="application/ld+json"]');
        let profileData = null;

        if (jsonLdScripts.length > 0) {
          try {
             const rawJson = jsonLdScripts.first().html();
             if (rawJson) profileData = JSON.parse(rawJson);
          } catch(e) {}
        }

        // Extract metadata
        const name = $('meta[property="og:title"]').attr('content') || profileData?.name;
        const bio = $('meta[property="og:description"]').attr('content') || profileData?.description;
        const avatar = $('meta[property="og:image"]').attr('content') || profileData?.image;

        results.push({
          url,
          name: name ? name.replace(' on Vimeo', '') : null,
          bio,
          avatarUrl: avatar,
          followers: null, // followers count requires parsing dynamic React state
          raw_ld_json: profileData
        });
      } catch (err: any) {
        results.push({ url, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
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
