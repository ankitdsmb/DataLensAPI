import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 2.10 Telegram Video Metadata
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { post_urls } = await req.json();
    if (!post_urls || !Array.isArray(post_urls)) throw new Error('post_urls array is required');

    const results = [];
    for (const url of post_urls) {
        // Change t.me to t.me/s/ for web preview without app prompt
        const webUrl = url.replace('t.me/', 't.me/s/');
        const response = await gotScraping.get(webUrl, { headerGeneratorOptions: { browsers: ['chrome'] } });
        const $ = cheerio.load(response.body);

        // Find the specific post by id (e.g., /s/channel/123)
        const postIdMatch = url.match(/\/(\d+)$/);
        const postId = postIdMatch ? postIdMatch[1] : null;

        let videoUrl = null;
        let text = null;

        if (postId) {
           const messageElement = $(`[data-post$="/${postId}"]`);
           videoUrl = messageElement.find('video').attr('src');
           text = messageElement.find('.tgme_widget_message_text').text();
        } else {
           // Fallback to first video on page
           videoUrl = $('video').attr('src');
           text = $('.tgme_widget_message_text').first().text();
        }

        results.push({
           url,
           media_type: videoUrl ? 'video' : 'text',
           video_url: videoUrl,
           caption: text || "No text found",
           channel: $('.tgme_channel_info_header_title').text().trim()
        });
    }

    return NextResponse.json({
      success: true,
      data: results,
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
