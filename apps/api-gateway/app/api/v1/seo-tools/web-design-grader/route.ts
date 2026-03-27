import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const webDesignPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

export const POST = withScrapingHandler({ policy: webDesignPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, webDesignPolicy);
  const urls = collectUrlInputs(body, webDesignPolicy);

  const results = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: webDesignPolicy.timeoutMs });
    const hasHero = $('h1').length > 0;
    const imageCount = $('img').length;
    const buttonCount = $('button, a.button, a.btn').length;
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() ?? null;

    let score = 50;
    if (hasHero) score += 15;
    if (metaDescription) score += 10;
    if (imageCount >= 3) score += 10;
    if (buttonCount >= 1) score += 10;
    if (imageCount === 0) score -= 10;

    results.push({
      url,
      score: Math.max(0, Math.min(100, score)),
      signals: {
        hasHero,
        metaDescriptionPresent: Boolean(metaDescription),
        imageCount,
        buttonCount
      }
    });
  }

  return { results };
});
