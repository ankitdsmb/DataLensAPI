import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 4.3 arXiv Article Metadata Scraper
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { url } = await req.json();
    if (!url) throw new Error('url is required (e.g., https://arxiv.org/abs/2310.12345)');

    const response = await gotScraping.get(url);
    const $ = cheerio.load(response.body);

    const title = $('h1.title').text().replace('Title:', '').trim();
    const authors = $('.authors a').map((_, el) => $(el).text()).get();
    const abstract = $('blockquote.abstract').text().replace('Abstract:', '').trim();
    const pdfUrl = url.replace('/abs/', '/pdf/') + '.pdf';
    const submittedDate = $('.dateline').text().match(/Submitted on (.+?)(\s|\()/)?.[1];

    return NextResponse.json({
      success: true,
      data: { url, title, authors, abstract, pdf_url: pdfUrl, submitted_date: submittedDate },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
