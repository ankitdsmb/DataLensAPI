import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// 4.3 arXiv Article Metadata Scraper

export const POST = withScrapingHandler(async (req: Request) => {

    const { url } = await req.json();
    if (!url) throw new Error('url is required (e.g., https://arxiv.org/abs/2310.12345)');

    const response = await stealthGet(url);
    const $ = cheerio.load(response.body);

    const title = $('h1.title').text().replace('Title:', '').trim();
    const authors = $('.authors a').map((_, el) => $(el).text()).get();
    const abstract = $('blockquote.abstract').text().replace('Abstract:', '').trim();
    const pdfUrl = url.replace('/abs/', '/pdf/') + '.pdf';
    const submittedDate = $('.dateline').text().match(/Submitted on (.+?)(\s|\()/)?.[1];

    return { url, title, authors, abstract, pdf_url: pdfUrl, submitted_date: submittedDate };


});
