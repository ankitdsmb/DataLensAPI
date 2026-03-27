import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  toAbsoluteUrl,
  withScrapingHandler
} from '@forensic/scraping-core';

const imageSeoAuditPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

type ImageIssue = {
  code: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function inferImageFormat(src: string | null) {
  if (!src) {
    return 'unknown';
  }

  if (src.startsWith('data:')) {
    return 'data-url';
  }

  try {
    const pathname = new URL(src, 'https://example.com').pathname.toLowerCase();
    const extension = pathname.split('.').pop() || 'unknown';
    return extension;
  } catch {
    return 'unknown';
  }
}

function isModernImageFormat(format: string) {
  return ['webp', 'avif', 'svg'].includes(format);
}

export const POST = withScrapingHandler({ policy: imageSeoAuditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, imageSeoAuditPolicy);
  const urls = collectUrlInputs(body, imageSeoAuditPolicy);

  const pages = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: imageSeoAuditPolicy.timeoutMs });

    const images = $('img')
      .toArray()
      .map((element, index) => {
        const src = $(element).attr('src')?.trim()
          || $(element).attr('data-src')?.trim()
          || null;
        const absoluteSrc = toAbsoluteUrl(src, url);
        const alt = $(element).attr('alt')?.trim() ?? null;
        const loading = $(element).attr('loading')?.trim() ?? null;
        const width = $(element).attr('width')?.trim() ?? null;
        const height = $(element).attr('height')?.trim() ?? null;
        const format = inferImageFormat(absoluteSrc);
        const issues: ImageIssue[] = [];

        if (alt === null) {
          issues.push({ code: 'missing_alt', severity: 'high', message: 'Image is missing alt text.' });
        } else if (alt.length === 0) {
          issues.push({ code: 'empty_alt', severity: 'medium', message: 'Image alt text is empty.' });
        }

        if (!width || !height) {
          issues.push({
            code: 'missing_dimensions',
            severity: 'medium',
            message: 'Image is missing width or height attributes.'
          });
        }

        if (!isModernImageFormat(format) && !['unknown', 'data-url'].includes(format)) {
          issues.push({
            code: 'non_modern_format',
            severity: 'low',
            message: `Image format ${format} is not a modern optimized format.`
          });
        }

        if (loading !== 'lazy') {
          issues.push({
            code: 'missing_lazy_loading',
            severity: 'low',
            message: 'Image is not using loading="lazy".'
          });
        }

        return {
          index,
          src: absoluteSrc,
          alt,
          loading,
          width,
          height,
          format,
          issues
        };
      });

    const totalIssues = images.reduce((sum, image) => sum + image.issues.length, 0);
    const missingAltCount = images.filter((image) => image.issues.some((issue) => issue.code === 'missing_alt')).length;
    const missingDimensionCount = images.filter((image) => image.issues.some((issue) => issue.code === 'missing_dimensions')).length;
    const nonModernFormatCount = images.filter((image) => image.issues.some((issue) => issue.code === 'non_modern_format')).length;

    let score = 100;
    score -= missingAltCount * 12;
    score -= missingDimensionCount * 8;
    score -= nonModernFormatCount * 4;

    pages.push({
      url,
      imageCount: images.length,
      missingAltCount,
      missingDimensionCount,
      nonModernFormatCount,
      images,
      score: clampScore(score)
    });
  }

  const totalIssues = pages.reduce((sum, page) => sum + page.images.reduce((pageSum, image) => pageSum + image.issues.length, 0), 0);
  const averageScore = pages.length === 0
    ? 0
    : Number((pages.reduce((sum, page) => sum + page.score, 0) / pages.length).toFixed(2));

  const summary = {
    pageCount: pages.length,
    totalImages: pages.reduce((sum, page) => sum + page.imageCount, 0),
    totalIssues,
    averageScore
  };

  if (pages.length === 1) {
    return {
      ...pages[0],
      pages,
      summary
    };
  }

  return {
    pages,
    summary
  };
});
