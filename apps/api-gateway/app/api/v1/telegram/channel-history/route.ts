import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// 4.4 Telegram Downloader - Message & Media

export const POST = withScrapingHandler(async (req: Request) => {

    const { channel_url, limit = 20 } = await req.json();
    if (!channel_url) throw new Error('channel_url is required');

    // Change t.me to t.me/s/ for web preview without app prompt
    const webUrl = channel_url.replace('t.me/', 't.me/s/');
    const response = await stealthGet(webUrl, { headerGeneratorOptions: { browsers: ['chrome'] } });
    const $ = cheerio.load(response.body);

    const history: any[] = [];

    // We scrape the visible HTML history on the channel web page.
    $('.tgme_widget_message').slice(-limit).each((_, el) => {
       const msgId = $(el).attr('data-post');
       const text = $(el).find('.tgme_widget_message_text').text();
       const videoUrl = $(el).find('video').attr('src');
       const imageUrl = $(el).find('.tgme_widget_message_photo_wrap').css('background-image')?.replace(/url\(('|")?(.*?)('|")?\)/i, "$2");
       const date = $(el).find('time').attr('datetime');

       history.push({
           message_id: msgId,
           text: text || null,
           media_type: videoUrl ? 'video' : imageUrl ? 'image' : null,
           media_url: videoUrl || imageUrl || null,
           date_posted: date
       });
    });

    return { channel: $('.tgme_channel_info_header_title').text().trim(), limit, total_extracted: history.length, history };


});
