import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 4.4 Telegram Downloader - Message & Media
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { channel_url, limit = 20 } = await req.json();
    if (!channel_url) throw new Error('channel_url is required');

    // Change t.me to t.me/s/ for web preview without app prompt
    const webUrl = channel_url.replace('t.me/', 't.me/s/');
    const response = await gotScraping.get(webUrl, { headerGeneratorOptions: { browsers: ['chrome'] } });
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

    return NextResponse.json({
      success: true,
      data: { channel: $('.tgme_channel_info_header_title').text().trim(), limit, total_extracted: history.length, history },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
