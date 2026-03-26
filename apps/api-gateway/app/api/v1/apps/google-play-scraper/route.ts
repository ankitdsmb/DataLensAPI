import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 5.7 Google Play Api
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { package_name, lang = 'en' } = await req.json();
    if (!package_name) throw new Error('package_name is required');

    const url = `https://play.google.com/store/apps/details?id=${package_name}&hl=${lang}&gl=us`;
    const response = await gotScraping.get(url, { headerGeneratorOptions: { browsers: ['chrome'] }});
    const $ = cheerio.load(response.body);

    // Initial basic parsing. Real parsing often requires finding AF_initDataCallback
    const title = $('h1').text();
    const developer = $('a.hrTbp').text();
    const icon = $('img[itemprop="image"]').attr('src');

    // We try to find the description in standard elements before digging into scripts
    let description = $('div[data-g-id="description"]').text();
    if (!description) {
      // Fallback: looking for AF_initDataCallback that contains the long description
      const scriptText = $('script:contains("AF_initDataCallback({key: \\'ds:5\\'")').text()
                      || $('script:contains("AF_initDataCallback")').text();
      const match = scriptText.match(/AF_initDataCallback\({.*data:(\[.*?\]), sideChannel: /);
      if(match) {
         try {
           const parsedData = JSON.parse(match[1]);
           // Highly volatile array indexes in Play Store JSON
           description = parsedData[10][1][0] || "Found data but could not parse description structure";
         } catch(e) {}
      }
    }

    return NextResponse.json({
      success: true,
      data: { package_name, title, developer, icon_url: icon, description_preview: description.substring(0, 200) + '...' },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
