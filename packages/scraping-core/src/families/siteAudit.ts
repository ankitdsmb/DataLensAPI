import {
  analyzeHeadingsSection,
  analyzeImageSeoSection,
  analyzeKeywordDensitySection,
  analyzeMetaTagsSection,
  buildScoreFromIssues,
  extractLinks,
  summarizeLinkSection,
  type AuditIssue
} from '../seoAudit';
import { fetchHtmlDocument } from '../html';

export type SiteAuditRequest = {
  urls: string[];
  keywords: string[];
  topN: number;
  timeoutMs: number;
};

export type SiteAuditPageResult = {
  url: string;
  score: number;
  issues: AuditIssue[];
  sections: {
    meta: ReturnType<typeof analyzeMetaTagsSection>;
    headings: ReturnType<typeof analyzeHeadingsSection>;
    images: ReturnType<typeof analyzeImageSeoSection>;
    keywords: ReturnType<typeof analyzeKeywordDensitySection>;
    links: ReturnType<typeof summarizeLinkSection>;
  };
};

export async function runLightSiteAudit(request: SiteAuditRequest): Promise<SiteAuditPageResult[]> {
  const pages: SiteAuditPageResult[] = [];

  for (const url of request.urls) {
    const { $ } = await fetchHtmlDocument(url, { timeoutMs: request.timeoutMs });
    const meta = analyzeMetaTagsSection($, url);
    const headings = analyzeHeadingsSection($);
    const images = analyzeImageSeoSection($, url);
    const keywords = analyzeKeywordDensitySection($, request.keywords, request.topN);
    const links = summarizeLinkSection(extractLinks($, url, false));
    const issues = [...meta.issues, ...headings.issues, ...images.issues, ...keywords.issues, ...links.issues];

    pages.push({
      url,
      score: buildScoreFromIssues(issues),
      issues,
      sections: {
        meta,
        headings,
        images,
        keywords,
        links
      }
    });
  }

  return pages;
}

export function summarizeSiteAuditPages(pages: SiteAuditPageResult[]) {
  return {
    pageCount: pages.length,
    siteScore:
      pages.length === 0
        ? 0
        : Number((pages.reduce((sum, page) => sum + page.score, 0) / pages.length).toFixed(2))
  };
}
