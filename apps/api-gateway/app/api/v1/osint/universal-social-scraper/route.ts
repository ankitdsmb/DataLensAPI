import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 6.7 ALL Social Media/WebScraper
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { url } = body;

    if (!url) throw new Error('url is required');

    const response = await gotScraping.get(url, {
       headerGeneratorOptions: { browsers: ['chrome'] }
    });

    const html = response.body;
    const $ = cheerio.load(html);

    // Platform detection
    let platform = "unknown";
    if (url.includes('twitter.com') || url.includes('x.com')) platform = "twitter";
    if (url.includes('instagram.com')) platform = "instagram";
    if (url.includes('tiktok.com')) platform = "tiktok";
    if (url.includes('linkedin.com')) platform = "linkedin";

    // Extract basic meta tags
    const title = $('title').text();
    const description = $('meta[name="description"], meta[property="og:description"]').attr('content') || "";
    const image = $('meta[property="og:image"]').attr('content') || "";

    // Simple heuristic profile data extraction based on platform
    let profileData: any = { handle: null, bio: description };

    if (platform === "twitter") {
        const handleMatch = url.match(/twitter\.com\/([a-zA-Z0-9_]+)/);
        profileData.handle = handleMatch ? handleMatch[1] : null;
    }

    return NextResponse.json({
      success: true,
      data: {
        platform,
        url,
        title,
        profile_data: profileData,
        avatar_url: image
      },
      metadata: {
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime
      },
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
