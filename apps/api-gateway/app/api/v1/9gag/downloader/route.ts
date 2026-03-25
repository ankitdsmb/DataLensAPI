import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { post_url } = body;

    if (!post_url) throw new Error('post_url is required');

    const response = await gotScraping.get(post_url, {
      headerGeneratorOptions: {
         browsers: ['chrome'],
         os: ['windows']
      }
    });

    const $ = cheerio.load(response.body);

    // Extract metadata
    const title = $('meta[property="og:title"]').attr('content') || $('title').text();
    const videoUrlStr = $('video source').attr('src');

    // Convert relative URL to absolute if necessary
    let video_url_mp4 = null;
    if (videoUrlStr) {
      if (videoUrlStr.startsWith('http')) {
        video_url_mp4 = videoUrlStr;
      } else {
        video_url_mp4 = new URL(videoUrlStr, post_url).href;
      }
    }

    // Attempt to extract upvotes or comments (often rendered via client-side JS)
    // 9GAG uses window._config or similar objects to store post state. We can try basic regex.
    const stateMatch = response.body.match(/"upVoteCount":(\d+)/);
    const upvotes = stateMatch ? parseInt(stateMatch[1]) : null;

    if (!video_url_mp4) {
      // It might be an image post instead of a video
      const imageUrlStr = $('meta[property="og:image"]').attr('content') || $('img.image-post').attr('src');
      if (imageUrlStr) {
        return NextResponse.json({
            success: true,
            data: {
              title,
              media_type: 'image',
              image_url: imageUrlStr,
              upvotes
            },
            metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
            error: null
        });
      }

      throw new Error('No media found for this post. Ensure it is a valid 9GAG video or image URL.');
    }

    return NextResponse.json({
      success: true,
      data: {
        title,
        media_type: 'video',
        video_url_mp4,
        upvotes
      },
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
