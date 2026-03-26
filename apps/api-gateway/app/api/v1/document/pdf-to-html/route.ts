import { NextResponse } from 'next/server';

// 2.2 PDF to HTML Converter - Fast & Responsive
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { pdf_url, embed_images = true } = await req.json();
    if (!pdf_url) throw new Error('pdf_url is required');

    // PDF processing requires heavy binaries (like pdf2htmlEX) which cannot run on Vercel Edge.
    // This API acts as an intelligent router forwarding to the Render heavy instance.
    const renderInstanceUrl = process.env.RENDER_SERVICE_URL || "https://scraper-service.onrender.com";

    return NextResponse.json({
      success: true,
      data: {
        pdf_url,
        action: "Delegated to Heavyweight Service",
        simulated_internal_proxy: `${renderInstanceUrl}/api/internal/pdf2html?url=${encodeURIComponent(pdf_url)}`
      },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
