import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
// 4.5 Extract Emails, Contacts, & Socials from Any Website

export const POST = withScrapingHandler(async (req: Request) => {

    const body = await req.json();
    const { url } = body;

    if (!url) {
      throw new Error('url is required in the payload.');
    }

    const response = await stealthGet(url);
    const html = response.body;

    // Regex patterns for extraction
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const socialRegex = /href="(https?:\/\/(?:www\.)?(?:linkedin|twitter|facebook|instagram|youtube)\.com\/[^"]+)"/gi;

    const emails = Array.from(new Set(html.match(emailRegex) || []));
    const phones = Array.from(new Set(html.match(phoneRegex) || []));

    const socials: string[] = [];
    let match;
    while ((match = socialRegex.exec(html)) !== null) {
      socials.push(match[1]);
    }
    const uniqueSocials = Array.from(new Set(socials));

    return {
        url,
        emails,
        phones,
        socials: uniqueSocials
      };



});
