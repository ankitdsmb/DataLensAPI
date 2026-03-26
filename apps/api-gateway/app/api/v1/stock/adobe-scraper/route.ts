import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 6.6 Adobe Stock Search Results Scraper
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { query, asset_type = "images", limit = 100 } = await req.json();
    if (!query) throw new Error('query is required');

    // Adobe stock uses a mix of server rendered state and CSR. We target the basic HTML results.
    const encodedQuery = encodeURIComponent(query);
    const url = `https://stock.adobe.com/search?k=${encodedQuery}&filters[content_type:${asset_type}]=1`;

    const response = await gotScraping.get(url, { headerGeneratorOptions: { browsers: ['chrome'] } });
    const $ = cheerio.load(response.body);

    const assets: any[] = [];
    $('.search-result-item-card').each((_, el) => {
       const id = $(el).attr('data-id');
       const title = $(el).find('img').attr('alt');
       const thumbnailUrl = $(el).find('img').attr('src');
       const creatorId = $(el).attr('data-creator-id');

       if (id && thumbnailUrl) {
          assets.push({ id, title, thumbnail_url: thumbnailUrl, creator_id: creatorId });
       }
    });

    return NextResponse.json({
      success: true,
      data: { query, asset_type, total_extracted: assets.length, assets: assets.slice(0, limit) },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
