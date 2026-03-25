import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

// Instagram Video Scraper - Lite
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) {
      throw new Error('Invalid payload: urls array is required.');
    }

    const results = [];

    // Simple implementation for the first URL as an example
    for (const url of urls) {
      try {
        // We use got-scraping to spoof TLS fingerprints and appear as a real browser
        const response = await gotScraping.get(url, {
          headerGeneratorOptions: {
            devices: ['mobile'],
            browsers: ['safari'],
            os: ['ios']
          }
        });

        // Instagram's internal data is often hidden in script tags or __initialData.
        // For this lite version, we simulate extraction. A real extraction would use cheerio
        // to find the specific script tag and JSON.parse it.
        const titleRegex = /<meta property="og:title" content="([^"]+)"/;
        const titleMatch = response.body.match(titleRegex);

        results.push({
          url,
          title: titleMatch ? titleMatch[1] : "Data extraction requires session cookie",
          status: "Scraped (Simulated without session)",
          likes_count: null, // Hard to extract without session/graphql
          upload_date: new Date().toISOString()
        });
      } catch (err: any) {
        results.push({ url, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
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
      metadata: {
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime
      },
      error: error.message
    }, { status: 400 });
  }
}
