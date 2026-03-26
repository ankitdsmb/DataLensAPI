import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';

// 4.6 Extract Emails, Socials and Contacts (Fastest version)
// Note: Next.js edge runtime / standard fetch is used here for pure speed instead of got-scraping overhead

export const POST = withScrapingHandler(async (req: Request) => {

    const { url } = await req.json();
    if (!url) throw new Error('url is required');

    // Using native fetch for maximum speed (no cheerio, pure regex)
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }});
    const html = await response.text();

    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/gi;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

    // Simpler, faster matching
    const emails = Array.from(new Set(html.match(emailRegex) || []));
    const phones = Array.from(new Set(html.match(phoneRegex) || []));

    return { url, total_found: emails.length + phones.length, emails, phones };


});
