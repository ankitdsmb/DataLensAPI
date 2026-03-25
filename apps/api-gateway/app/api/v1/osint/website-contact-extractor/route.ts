import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

// 4.5 Extract Emails, Contacts, & Socials from Any Website
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      throw new Error('url is required in the payload.');
    }

    const response = await gotScraping.get(url);
    const html = response.body;

    // Regex patterns for extraction
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const socialRegex = /href="(https?:\/\/(?:www\.)?(?:linkedin|twitter|facebook|instagram|youtube)\.com\/[^"]+)"/gi;

    const emails = [...new Set(html.match(emailRegex) || [])];
    const phones = [...new Set(html.match(phoneRegex) || [])];

    const socials: string[] = [];
    let match;
    while ((match = socialRegex.exec(html)) !== null) {
      socials.push(match[1]);
    }
    const uniqueSocials = [...new Set(socials)];

    return NextResponse.json({
      success: true,
      data: {
        url,
        emails,
        phones,
        socials: uniqueSocials
      },
      metadata: {
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime
      },
      error: null
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      data: null,
      metadata: {
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime
      },
      error: error.message || 'Internal Server Error'
    }, { status: 400 });
  }
}
