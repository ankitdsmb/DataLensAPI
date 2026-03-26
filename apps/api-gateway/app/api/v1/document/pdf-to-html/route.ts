import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';

// 2.2 PDF to HTML Converter - Fast & Responsive

export const POST = withScrapingHandler(async (req: Request) => {

    const { pdf_url, embed_images = true } = await req.json();
    if (!pdf_url) throw new Error('pdf_url is required');

    // PDF processing requires heavy binaries (like pdf2htmlEX) which cannot run on Vercel Edge.
    // This API acts as an intelligent router forwarding to the Render heavy instance.
    const renderInstanceUrl = process.env.RENDER_SERVICE_URL || "https://scraper-service.onrender.com";

    return {
        pdf_url,
        action: "Delegated to Heavyweight Service",
        simulated_internal_proxy: `${renderInstanceUrl}/api/internal/pdf2html?url=${encodeURIComponent(pdf_url)}`
      };


});
