import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  getAttribute,
  getElementText,
  getMetaContent,
  readJsonBody,
  toAbsoluteUrl,
  withScrapingHandler
} from '@forensic/scraping-core';

const metaTagsAuditPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

type MetaIssue = {
  code: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function analyzeMetaTags(url: string, page: Record<string, string | null>) {
  const issues: MetaIssue[] = [];
  let score = 100;

  if (!page.title) {
    issues.push({ code: 'missing_title', severity: 'high', message: 'Page title is missing.' });
    score -= 25;
  } else if (page.title.length > 60) {
    issues.push({ code: 'title_too_long', severity: 'medium', message: 'Page title is longer than 60 characters.' });
    score -= 8;
  }

  if (!page.metaDescription) {
    issues.push({ code: 'missing_meta_description', severity: 'high', message: 'Meta description is missing.' });
    score -= 20;
  } else if (page.metaDescription.length > 160) {
    issues.push({
      code: 'description_too_long',
      severity: 'medium',
      message: 'Meta description is longer than 160 characters.'
    });
    score -= 8;
  }

  if (!page.canonicalUrl) {
    issues.push({ code: 'missing_canonical', severity: 'medium', message: 'Canonical URL is missing.' });
    score -= 10;
  }

  if (!page.ogTitle) {
    issues.push({ code: 'missing_og_title', severity: 'medium', message: 'Open Graph title is missing.' });
    score -= 8;
  }

  if (!page.ogDescription) {
    issues.push({
      code: 'missing_og_description',
      severity: 'medium',
      message: 'Open Graph description is missing.'
    });
    score -= 8;
  }

  if (!page.ogImage) {
    issues.push({ code: 'missing_og_image', severity: 'medium', message: 'Open Graph image is missing.' });
    score -= 8;
  }

  if (!page.twitterCard) {
    issues.push({ code: 'missing_twitter_card', severity: 'low', message: 'Twitter card metadata is missing.' });
    score -= 5;
  }

  if (page.robots?.toLowerCase().includes('noindex')) {
    issues.push({ code: 'robots_noindex', severity: 'high', message: 'Robots meta tag contains noindex.' });
    score -= 18;
  }

  return {
    url,
    ...page,
    titleLength: page.title?.length ?? 0,
    descriptionLength: page.metaDescription?.length ?? 0,
    issues,
    score: clampScore(score)
  };
}

export const POST = withScrapingHandler({ policy: metaTagsAuditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, metaTagsAuditPolicy);
  const urls = collectUrlInputs(body, metaTagsAuditPolicy);

  const pages = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: metaTagsAuditPolicy.timeoutMs });

    const page = analyzeMetaTags(url, {
      title: getElementText($, 'title'),
      metaDescription: getMetaContent($, 'meta[name="description"]'),
      canonicalUrl: toAbsoluteUrl(getAttribute($, 'link[rel="canonical"]', 'href'), url),
      robots: getMetaContent($, 'meta[name="robots"]'),
      ogTitle: getMetaContent($, 'meta[property="og:title"]'),
      ogDescription: getMetaContent($, 'meta[property="og:description"]'),
      ogImage: toAbsoluteUrl(getMetaContent($, 'meta[property="og:image"]'), url),
      twitterCard: getMetaContent($, 'meta[name="twitter:card"]'),
      twitterTitle: getMetaContent($, 'meta[name="twitter:title"]'),
      twitterDescription: getMetaContent($, 'meta[name="twitter:description"]'),
      twitterImage: toAbsoluteUrl(getMetaContent($, 'meta[name="twitter:image"]'), url)
    });

    pages.push(page);
  }

  const totalIssues = pages.reduce((sum, page) => sum + page.issues.length, 0);
  const averageScore = pages.length === 0
    ? 0
    : Number((pages.reduce((sum, page) => sum + page.score, 0) / pages.length).toFixed(2));

  const summary = {
    pageCount: pages.length,
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
