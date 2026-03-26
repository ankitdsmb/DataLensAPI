import { NextResponse } from 'next/server';

// 4.6 Extract Emails, Socials and Contacts (Fastest version)
// Note: Next.js edge runtime / standard fetch is used here for pure speed instead of got-scraping overhead
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { url } = await req.json();
    if (!url) throw new Error('url is required');

    // Using native fetch for maximum speed (no cheerio, pure regex)
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }});
    const html = await response.text();

    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/gi;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

    // Simpler, faster matching
    const emails = [...new Set(html.match(emailRegex) || [])];
    const phones = [...new Set(html.match(phoneRegex) || [])];

    return NextResponse.json({
      success: true,
      data: { url, total_found: emails.length + phones.length, emails, phones },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
