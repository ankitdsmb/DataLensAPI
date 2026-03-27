import {
  collectUrlInputs,
  createToolPolicy,
  fetchHtmlDocument,
  readJsonBody,
  withScrapingHandler
} from '@forensic/scraping-core';

const headingsAuditPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 96 * 1024,
  maxUrlCount: 5,
  anonymous: true,
  cacheTtlSeconds: 300
});

type HeadingIssue = {
  code: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export const POST = withScrapingHandler({ policy: headingsAuditPolicy }, async (req: Request) => {
  const body = await readJsonBody<Record<string, unknown>>(req, headingsAuditPolicy);
  const urls = collectUrlInputs(body, headingsAuditPolicy);

  const pages = [];

  for (const url of urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: headingsAuditPolicy.timeoutMs });

    const headings = $('h1, h2, h3, h4, h5, h6')
      .toArray()
      .map((element, index) => {
        const tagName = element.tagName.toLowerCase();
        const level = Number(tagName.replace('h', ''));
        const text = $(element).text().replace(/\s+/g, ' ').trim();

        return {
          index,
          level,
          tag: tagName,
          text
        };
      });

    const issues: HeadingIssue[] = [];
    let score = 100;
    const counts = {
      h1: headings.filter((heading) => heading.level === 1).length,
      h2: headings.filter((heading) => heading.level === 2).length,
      h3: headings.filter((heading) => heading.level === 3).length,
      h4: headings.filter((heading) => heading.level === 4).length,
      h5: headings.filter((heading) => heading.level === 5).length,
      h6: headings.filter((heading) => heading.level === 6).length
    };

    if (counts.h1 === 0) {
      issues.push({ code: 'missing_h1', severity: 'high', message: 'Page is missing an H1 heading.' });
      score -= 25;
    }

    if (counts.h1 > 1) {
      issues.push({ code: 'multiple_h1', severity: 'medium', message: 'Page contains multiple H1 headings.' });
      score -= 12;
    }

    if (headings.length === 0) {
      issues.push({ code: 'no_headings', severity: 'high', message: 'Page contains no heading tags.' });
      score -= 25;
    }

    headings.forEach((heading) => {
      if (!heading.text) {
        issues.push({
          code: 'empty_heading_text',
          severity: 'medium',
          message: `Heading ${heading.tag.toUpperCase()} is empty.`
        });
        score -= 6;
      }
    });

    for (let index = 1; index < headings.length; index += 1) {
      const previousLevel = headings[index - 1].level;
      const currentLevel = headings[index].level;

      if (currentLevel > previousLevel + 1) {
        issues.push({
          code: 'heading_level_jump',
          severity: 'medium',
          message: `Heading structure jumps from H${previousLevel} to H${currentLevel}.`
        });
        score -= 8;
      }
    }

    pages.push({
      url,
      counts,
      headings,
      issues,
      score: clampScore(score)
    });
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
