import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';


export const POST = withScrapingHandler(async (req: Request) => {

    const body = await req.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) throw new Error('urls array is required');

    const results = [];

    for (const url of urls) {
      try {
        const response = await stealthGet(url);
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

    return results;



});
