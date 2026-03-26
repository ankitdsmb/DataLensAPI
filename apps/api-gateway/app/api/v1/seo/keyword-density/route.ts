import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
// @ts-ignore - Assuming stopword doesn't have proper types or we ignore them for speed
import * as sw from 'stopword';


export const POST = withScrapingHandler(async (req: Request) => {

    const body = await req.json();
    const { url } = body;

    if (!url) throw new Error('url is required');

    const response = await stealthGet(url);
    const $ = cheerio.load(response.body);

    // Remove unwanted elements
    $('script, style, noscript, nav, header, footer, iframe, img').remove();

    // Extract remaining text
    const text = $('body').text();

    // Tokenize words (basic regex)
    const words = text
      .replace(/[^a-zA-Z\s]/g, ' ') // Remove non-letters
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2); // Ignore very short words

    // Remove stop words
    const meaningfulWords = sw.removeStopwords(words);

    const wordCounts: { [key: string]: number } = {};
    meaningfulWords.forEach((word: string) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    const totalWords = meaningfulWords.length;

    const densityList = Object.keys(wordCounts).map(word => {
      return {
        keyword: word,
        count: wordCounts[word],
        density: ((wordCounts[word] / totalWords) * 100).toFixed(2) + '%'
      };
    }).sort((a, b) => b.count - a.count).slice(0, 50); // Top 50 keywords

    return {
        url,
        analyzed_word_count: totalWords,
        keywords: densityList
      };



});
