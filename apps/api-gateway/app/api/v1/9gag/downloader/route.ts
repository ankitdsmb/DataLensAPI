import { withScrapingHandler, stealthGet } from '@forensic/scraping-core';
import * as cheerio from 'cheerio';

export const POST = withScrapingHandler(async (req: Request) => {
    const { post_url } = await req.json();
    if (!post_url) throw new Error('post_url is required');

    const response = await stealthGet(post_url);
    const $ = cheerio.load(response.body);

    const title = $('meta[property="og:title"]').attr('content') || $('title').text();
    const videoUrlStr = $('video source').attr('src');

    let video_url_mp4 = null;
    if (videoUrlStr) {
      if (videoUrlStr.startsWith('http')) {
        video_url_mp4 = videoUrlStr;
      } else {
        video_url_mp4 = new URL(videoUrlStr, post_url).href;
      }
    }

    const stateMatch = response.body.match(/"upVoteCount":(\d+)/);
    const upvotes = stateMatch ? parseInt(stateMatch[1]) : null;

    if (!video_url_mp4) {
      const imageUrlStr = $('meta[property="og:image"]').attr('content') || $('img.image-post').attr('src');
      if (imageUrlStr) {
        return {
              title,
              media_type: 'image',
              image_url: imageUrlStr,
              upvotes
        };
      }
      throw new Error('No media found for this post. Ensure it is a valid 9GAG video or image URL.');
    }

    return {
        title,
        media_type: 'video',
        video_url_mp4,
        upvotes
    };
});
