import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
// 5.4 Apple Store Api

export const POST = withScrapingHandler(async (req: Request) => {

    const { app_id, country = 'us' } = await req.json();
    if (!app_id) throw new Error('app_id is required');

    // Apple has a public iTunes Search API that is perfect for this
    const url = `https://itunes.apple.com/lookup?id=${app_id}&country=${country}`;
    const response = await stealthGet(url, { responseType: 'json' });
    const data = response.body as any;

    if (data.resultCount === 0) throw new Error('App not found or not available in this country.');

    const appData = data.results[0];

    return {
        app_id,
        name: appData.trackName,
        developer: appData.sellerName,
        price: appData.price,
        currency: appData.currency,
        rating: appData.averageUserRating,
        rating_count: appData.userRatingCount,
        version: appData.version,
        release_notes: appData.releaseNotes,
        description: appData.description,
        icon_url: appData.artworkUrl512,
        screenshots: appData.screenshotUrls
      };


});
