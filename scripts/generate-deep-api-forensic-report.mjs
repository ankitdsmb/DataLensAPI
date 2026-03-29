import fs from 'node:fs';
import path from 'node:path';

const REPORT_PATH = 'docs/reports/2026-03-28-deep-api-forensic-analysis.md';
const ROUTES_DIR = 'apps/api-gateway/app/api/v1/seo-tools';
const PLAN_PATH = 'docs/api-plans/dev-and-seo-tooling-list.md';

const removedOnGitHubMain = new Set([
  'complete-seo-audit-tool-comprehensive-website-seo-analysis',
  'discord-forum-to-website',
  'discord-website-generator',
  'keyword-density-checker',
  'meta-tags-check-api',
  'moz-domain-authority-checker',
  'quick-lh',
  'seo-image-audit-tool-analyze-optimize-website-images',
  'seobility-keyword-research-rental-unlimited-seo',
  'simple-http-status-code-checker',
  'simple-seo-auditor-plus',
  'sitemap-generator',
  'sitepulse',
  'website-traffic-analysis'
]);

const validationUpgradedOnGitHubMain = new Set([
  'amazon-keywords-discovery-tool',
  'app-store-keywords-discovery-tool',
  'bing-keywords-discovery-tool',
  'domain-availability-checker',
  'domain-availability-expiry-whois-dns-ip-asn-70-tld',
  'domain-checker',
  'domain-inspector',
  'ebay-keywords-discovery-tool',
  'google-play-keywords-discovery-tool',
  'new-web-traffic-generator-youtube-vimeo-twitch',
  'organic-visit-simulator-x',
  'pro-seo-audit-tool-get-your-website-data-for-search-engines',
  'search-keyword-research',
  'seo-audit-tool',
  'seobility-ranking-seo',
  'similar-app-store-applications-finder',
  'smart-website-traffic',
  'website-traffic-generator-pro',
  'youtube-keywords-discovery-tool',
  'youtube-view-generator'
]);

const routeOverrides = {
  'keyword-density-checker': {
    strength: '4/5',
    coverage: '~75%',
    current: 'Real shared keyword-density analyzer over live HTML.',
    gap: 'No rendered DOM, competitor baseline, or content-section analysis.',
    upgrade: 'Keep as light mode, then add rendered mode and competitor comparison.'
  },
  'meta-tags-check-api': {
    strength: '4/5',
    coverage: '~70%',
    current: 'Real meta-tag audit using shared SEO analyzers.',
    gap: 'No social preview rendering or structured-data validation.',
    upgrade: 'Fold into a canonical meta audit suite with OG/Twitter previews.'
  },
  'complete-seo-audit-tool-comprehensive-website-seo-analysis': {
    strength: '4/5',
    coverage: '~78%',
    current: 'Strongest single-route lightweight audit in the repo.',
    gap: 'Still static HTML only; GitHub main appears to have lost this route.',
    upgrade: 'Use this as seed logic for the canonical site-audit suite.'
  },
  'seo-audit-tool': {
    strength: '4/5',
    coverage: '~75%',
    current: 'Real multi-section HTML audit with scores and issues.',
    gap: 'No browser execution, artifacts, or history.',
    upgrade: 'Merge duplicate audit SKUs into one canonical family with modes.'
  },
  'sitepulse': {
    strength: '4/5',
    coverage: '~78%',
    current: 'Useful synchronous crawl-plus-audit flow with site score.',
    gap: 'No async job path, robots policy, or artifact persistence.',
    upgrade: 'Promote into async crawl mode inside the site-audit family.'
  },
  'web-design-grader': {
    strength: '2/5',
    coverage: '~20%',
    current: 'Simple heuristic scoring based on hero/image/button presence.',
    gap: 'Far below the promised design/conversion intelligence.',
    upgrade: 'Replace with screenshot-backed rubric and recommendation engine.'
  },
  'pagespeed-insights-checker': {
    strength: '2/5',
    coverage: '~20%',
    current: 'Network timing plus a few HTTP headers only.',
    gap: 'Not real PageSpeed Insights or Lighthouse output.',
    upgrade: 'Replace with a real performance-audit provider and artifact mode.'
  },
  'website-speed-checker': {
    strength: '2/5',
    coverage: '~25%',
    current: 'Low-level response timing and header check.',
    gap: 'No CWV or Lighthouse metrics.',
    upgrade: 'Keep as a sub-check only inside a true performance suite.'
  },
  'open-graph-image-generator': {
    strength: '1/5',
    coverage: '~10%',
    current: 'Builds a dummyimage.com URL instead of rendering assets in DataLens.',
    gap: 'No first-party rendering pipeline or artifact storage.',
    upgrade: 'Move into a real image-generation suite with templates and storage.'
  },
  'openpagerank-bulk-checker': {
    strength: '1/5',
    coverage: '~5%',
    current: 'Normalizes domains and returns an explicit internal provider-template contract with non-executed provider state.',
    gap: 'No live provider data exists yet.',
    upgrade: 'Either integrate the provider or keep it internal-only as a provider template.'
  },
  'moz-domain-authority-checker': {
    strength: '1/5',
    coverage: '~5%',
    current: 'Validates input and returns null authority fields.',
    gap: 'No provider integration.',
    upgrade: 'Implement inside an authority-metrics suite or mark not-live.'
  },
  'rentcast': {
    strength: '1/5',
    coverage: '~10%',
    current: 'Builds a normalized lookup URL and returns an explicit internal provider-template contract.',
    gap: 'No live provider data.',
    upgrade: 'Either integrate the provider or keep it internal-only as a provider template.'
  },
  'similarweb': {
    strength: '1/5',
    coverage: '~10%',
    current: 'Returns a Similarweb report URL only.',
    gap: 'No analytics extraction or normalization.',
    upgrade: 'Rebuild as real traffic intelligence or relabel honestly.'
  },
  'spotify': {
    strength: '1/5',
    coverage: '~10%',
    current: 'Returns a Spotify search URL only.',
    gap: 'No track, artist, album, playlist, or pagination data.',
    upgrade: 'Implement a real provider-backed media connector.'
  },
  'business-websites-ranker': {
    cls: 'html-scraper',
    strength: '3/5',
    coverage: '~40%',
    current: 'Discovers public business websites from DuckDuckGo HTML results and applies lightweight website-quality scoring on the discovered domains.',
    gap: 'Discovery is still heuristic and not authoritative Google Places data, so non-official sites can still slip into the candidate set.',
    upgrade: 'Promote into a local-business intelligence family with stronger business-source discovery, homepage normalization, and multi-page scoring.',
    fit: 'Usually fine on free serverless if inputs stay capped.'
  },
  'cms-checker': {
    cls: 'html-scraper',
    strength: '3/5',
    coverage: '~50%',
    current: 'Fetches live HTML and applies lightweight technology fingerprinting to identify likely CMS and related site-stack signals.',
    gap: 'Still heuristic and does not yet model competitors, confidence scoring, or deeper script execution.',
    upgrade: 'Promote into a canonical tech-fingerprint family with stronger signatures, structured evidence, and optional confidence weighting.',
    fit: 'Usually fine on free serverless if inputs stay capped.'
  },
  'cms-checker-bulk': {
    cls: 'html-scraper',
    strength: '3/5',
    coverage: '~50%',
    current: 'Fetches live HTML for multiple URLs and applies lightweight technology fingerprinting to identify likely CMS and related site-stack signals.',
    gap: 'Still heuristic and does not yet model competitors, confidence scoring, or deeper script execution.',
    upgrade: 'Promote into a canonical tech-fingerprint family with stronger signatures, structured evidence, bulk tuning, and optional confidence weighting.',
    fit: 'Usually fine on free serverless if inputs stay capped.'
  },
  'quick-lh': {
    strength: '1/5',
    coverage: '~5%',
    current: 'Queued placeholder only.',
    gap: 'No Lighthouse job, no status endpoint, no artifacts.',
    upgrade: 'Do not expose publicly until the async worker exists.'
  },
  'snapify-capture-screenshot-save-pdf': {
    strength: '3/5',
    coverage: '~40%',
    current: 'Real async job submission plus live HTML evidence capture and persisted report artifacts.',
    gap: 'Still no rendered screenshot or PDF binary generation.',
    upgrade: 'Keep evidence-capture mode as fallback and add real browser/PDF rendering in the worker.'
  },
  'youtube-rank-checker': {
    strength: '3/5',
    coverage: '~45%',
    current: 'Real async job submission plus lightweight YouTube search evidence parsing with deterministic fallback.',
    gap: 'Current parsing path is fragile and degrades to simulation when live evidence is unavailable.',
    upgrade: 'Promote into a canonical rank-tracker family with retries, provenance, and hardened evidence capture.'
  },
  'youtube-region-restriction-checker': {
    strength: '3/5',
    coverage: '~45%',
    current: 'Fetches the public YouTube watch page and parses playability plus availableCountries evidence.',
    gap: 'Still depends on watch-page HTML and does not independently verify playback from each market.',
    upgrade: 'Promote into a canonical YouTube availability tool with stronger extraction, retries, and optional country-by-country probe modes.'
  },
  'domain-intelligence-suite': {
    strength: '3/5',
    coverage: '~50%',
    current: 'Runs live DNS lookups plus an HTTPS reachability snapshot and returns normalized light-mode evidence.',
    gap: 'WHOIS, ASN, and SSL certificate inspection are still null in light mode.',
    upgrade: 'Promote into the full canonical domain intelligence family with WHOIS/RDAP, SSL parsing, and registrar enrichment.'
  },
  'domain-inspector': {
    strength: '3/5',
    coverage: '~45%',
    current: 'Performs live DNS and HTTP inspection for a single domain.',
    gap: 'WHOIS and SSL posture are still not implemented despite the broader product promise.',
    upgrade: 'Share the canonical domain suite DTOs and add optional WHOIS/SSL enrichment.'
  },
  'domain-checker': {
    strength: '3/5',
    coverage: '~35%',
    current: 'Performs a live DNS availability check against public resolvers.',
    gap: 'Market value, suggestions, and enrichment remain unimplemented.',
    upgrade: 'Either keep it as a lite DNS availability tool or fold it into the canonical domain suite.'
  },
  'domain-availability-checker': {
    strength: '3/5',
    coverage: '~35%',
    current: 'Performs a live DNS availability check against public resolvers.',
    gap: 'Only checks resolver status; registrar-grade availability evidence is still missing.',
    upgrade: 'Keep public as a lite availability signal or deepen with registrar/RDAP evidence.'
  },
  'trustpilot-plus': {
    strength: '3/5',
    coverage: '~40%',
    current: 'Fetches the public Trustpilot review page and extracts aggregate rating plus review-count evidence when the identifier resolves directly.',
    gap: 'Still depends on a resolvable review identifier and does not paginate individual reviews or compute sentiment.',
    upgrade: 'Promote into a marketplace-review connector with identifier discovery, review pagination, and normalized sentiment/review DTOs.'
  },
  'what-site': {
    cls: 'html-scraper',
    strength: '4/5',
    coverage: '~65%',
    current: 'Fetches live HTML and returns a normalized site profile with final URL, metadata, heading, link, and content signals for each supplied URL.',
    gap: 'Still only inspects the fetched page and does not yet parse structured data deeply, crawl site sections, or resolve brand/entity context.',
    upgrade: 'Promote into a canonical site-profile family with structured-data extraction, home-vs-page normalization, and optional shallow crawl mode.',
    fit: 'Excellent free-tier fit with small URL caps and response caching.'
  },
  'whatruns': {
    cls: 'html-scraper',
    strength: '3/5',
    coverage: '~50%',
    current: 'Fetches live HTML and applies lightweight technology fingerprinting across CMS, frontend, ecommerce, analytics, and infrastructure categories.',
    gap: 'Still heuristic and does not yet provide vendor-grade detection confidence or browser-executed technology discovery.',
    upgrade: 'Promote into a canonical tech-fingerprint family with stronger signatures, confidence scoring, and optional rendered-mode verification.',
    fit: 'Usually fine on free serverless if inputs stay capped.'
  },
  'bulk-bbb': {
    cls: 'html-scraper',
    strength: '3/5',
    coverage: '~40%',
    current: 'Fetches public BBB search pages in bulk and enriches the best matched profile for each company with rating evidence and complaint signals.',
    gap: 'Still caps batch size, does not paginate customer reviews, and does not normalize complaint timelines across all matched businesses.',
    upgrade: 'Promote into a marketplace-review connector with reusable BBB parsers, bulk enrichment, and structured complaint/review timelines.',
    fit: 'Usually fine on free serverless if inputs stay capped.'
  },
  'shopify-product-search': {
    cls: 'public-api-wrapper',
    strength: '3/5',
    coverage: '~45%',
    current: 'Uses public Shopify storefront predictive search or products-feed endpoints to return normalized product evidence for the supplied store.',
    gap: 'Coverage still depends on public storefront endpoints and does not yet normalize variants, pagination, or collection context.',
    upgrade: 'Promote into a reusable ecommerce storefront connector with variant normalization, pagination, richer product DTOs, and store capability detection.',
    fit: 'Strong free-tier fit with per-store caps and caching.'
  },
  'spell-checker': {
    cls: 'public-api-wrapper',
    strength: '3/5',
    coverage: '~45%',
    current: 'Calls the public LanguageTool endpoint and returns real spelling and grammar match evidence with suggested replacements for capped text inputs.',
    gap: 'Still depends on the public LanguageTool surface and does not yet support batching, richer writing-quality scoring, or style rewrite workflows.',
    upgrade: 'Promote into a canonical writing-quality family with batching, language normalization, caching, and adjacent grammar/readability/profanity capabilities.',
    fit: 'Strong free-tier fit with strict text caps, caching, and throttling.'
  },
  'simple-bbb': {
    strength: '3/5',
    coverage: '~45%',
    current: 'Fetches the public BBB search page, parses visible business matches, and enriches the best match with profile metadata, BBB rating evidence, and complaint signals.',
    gap: 'Still does not paginate customer reviews or return a normalized complaints timeline across all matched companies.',
    upgrade: 'Promote into a marketplace-review connector with reusable BBB parsers, bulk enrichment, and structured complaint/review timelines.'
  }
};

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function parsePlan() {
  const md = fs.readFileSync(PLAN_PATH, 'utf8');
  const lines = md.split(/\r?\n/).filter((line) => line.startsWith('| TN-API-'));
  const rows = lines
    .map((line) => line.split('|').slice(1, -1).map((part) => part.trim()))
    .filter((row) => row.length >= 11 && typeof row[6] === 'string' && row[6].includes('/api/v1/'));
  const byEndpoint = new Map();

  for (const row of rows) {
    const [ticket, category, apiName, , , summary, endpoint, priority, , , created] = row;
    const cleanEndpoint = endpoint.replace(/`/g, '');
    const current = byEndpoint.get(cleanEndpoint) ?? {
      tickets: [],
      categories: new Set(),
      names: new Set(),
      summaries: new Set(),
      priorities: new Set(),
      createdFlags: new Set()
    };
    current.tickets.push(ticket);
    current.categories.add(category);
    current.names.add(apiName);
    current.summaries.add(summary);
    current.priorities.add(priority);
    current.createdFlags.add(created);
    byEndpoint.set(cleanEndpoint, current);
  }

  return { rows, byEndpoint };
}

function classify(slug, src) {
  if (/pending_api_key/.test(src)) return 'api-key-stub';
  if (/status:\s*['"](queued|pending)['"]|job_id|jobId|processing/i.test(src)) return 'queued-placeholder';
  if (/(lookupDomainARecord|fetchDomainHttpSnapshot|runDnsMatrixLookup|lookupDnsRecord)\(/.test(src)) return 'network-wrapper';
  if (!/stealthGet\(|stealthMobileGet\(|fetchHtmlDocument\(/.test(src) && /dummyimage\.com/.test(src)) return 'template-link-builder';
  if (!/stealthGet\(|stealthMobileGet\(|fetchHtmlDocument\(/.test(src) && /(searchUrl|reportUrl|lookupUrl|videoUrl)\s*[:=]/.test(src)) return 'link-builder';
  if (/fetchHtmlDocument\(/.test(src) && /(analyzeMetaTagsSection|analyzeHeadingsSection|analyzeImageSeoSection|analyzeKeywordDensitySection|buildScoreFromIssues)/.test(src)) return 'audit-suite';
  if (/fetchHtmlDocument\(/.test(src) && /queue\s*=\s*\[|visited\s*=\s*new Set|extractLinks/.test(src)) return 'crawler-tool';
  if (/fetchHtmlDocument\(/.test(src)) return 'html-scraper';
  if (/(stealthGet\(|stealthMobileGet\()/.test(src) && /(JSON\.parse\(|safeJsonParse\()/.test(src)) return 'public-api-wrapper';
  if (/(stealthGet\(|stealthMobileGet\()/.test(src)) return 'network-wrapper';
  return 'local-utility';
}

function inferFamily(slug, summary) {
  const text = `${slug} ${summary}`.toLowerCase();
  if (/traffic|view-generator|webrocket|organic visit|load stress|spike simulator/.test(text)) return 'traffic-simulation';
  if (/keyword|autocomplete|suggester|suggestions/.test(text)) return 'keyword-discovery';
  if (/domain|dns|whois|subdomain|availability|asn|tumblr/.test(text)) return 'domain-intelligence';
  if (/audit|seo|meta tags|headings|readability|pagespeed|website speed|w3c|axe|grader|reporter/.test(text)) return 'audit-and-quality';
  if (/help center|knowledge base|uservoice|canny|gainsight|zoho|crisp|front/.test(text)) return 'knowledge-base-connector';
  if (/builtwith|built with|whatruns|cms checker|technology/.test(text)) return 'tech-stack';
  if (/reddit|bluesky|mastodon|twitter|x-twitter|social/.test(text)) return 'social-public-data';
  if (/tripadvisor|vrbo|skyscanner|car hire|opentable|showtimes/.test(text)) return 'travel-connector';
  if (/ebay|etsy|shopify|app store|google play|appodeal|flippa|appsumo|software advice|capterra|bbb|trustpilot|partner|zapier|apideck|clearbit|rentcast/.test(text)) return 'public-connector';
  if (/table generator|shortener|hashtag|spell|profanity|barcode|image generator|pdf|screenshot/.test(text)) return 'developer-utility';
  return 'general-public-data';
}

const classDefaults = {
  'audit-suite': {
    strength: '4/5',
    coverage: '~70%',
    current: 'Real lightweight HTML audit using shared analyzers and synthetic scoring.',
    gap: 'Still limited to source HTML; browser evidence and artifact history are missing.',
    upgrade: 'Collapse duplicate audit routes into canonical families with light, rendered, and async modes.',
    fit: 'Good free-tier fit for capped HTML mode; richer audit modes need workers.'
  },
  'crawler-tool': {
    strength: '3/5',
    coverage: '~55%',
    current: 'Real crawl/graph logic over a constrained number of pages.',
    gap: 'Synchronous in-memory crawling will not scale without async jobs and storage.',
    upgrade: 'Move larger crawl workflows behind a queue and artifact layer.',
    fit: 'Borderline on free serverless; use strict page caps.'
  },
  'html-scraper': {
    strength: '3/5',
    coverage: '~45%',
    current: 'Fetches live HTML and extracts a narrow set of visible fields.',
    gap: 'Selectors are shallow and usually miss pagination, schema, or deep entity normalization.',
    upgrade: 'Push repeated extraction into shared provider adapters and normalized DTOs.',
    fit: 'Usually fine on free serverless if inputs stay capped.'
  },
  'public-api-wrapper': {
    strength: '3/5',
    coverage: '~55%',
    current: 'Calls a public endpoint and returns minimally normalized JSON.',
    gap: 'Still needs safe parsing, locale validation, and provider abstraction.',
    upgrade: 'Create shared provider adapters with DTOs, cache, and better error shaping.',
    fit: 'Strong free-tier fit with caching and throttling.'
  },
  'network-wrapper': {
    strength: '2/5',
    coverage: '~35%',
    current: 'Performs a low-level network lookup/check and returns thin diagnostics.',
    gap: 'Often too shallow relative to the marketed feature set.',
    upgrade: 'Either relabel as lite network diagnostics or deepen the provider integration.',
    fit: 'Easy to host; product depth is the main issue.'
  },
  'local-utility': {
    strength: '2/5',
    coverage: '~25%',
    current: 'Implements a local heuristic or convenience transform without a real provider.',
    gap: 'Many are useful as lite helpers but not strong enough for the current product promise.',
    upgrade: 'Relabel as lite utilities or back them with stronger engines/providers.',
    fit: 'Excellent technical fit for free hosting.'
  },
  'link-builder': {
    strength: '1/5',
    coverage: '~10%',
    current: 'Mostly validates input and returns an external search/report URL.',
    gap: 'No first-party data extraction or enrichment occurs.',
    upgrade: 'Either relabel honestly or rebuild behind a real provider adapter.',
    fit: 'Technically trivial to host, commercially thin.'
  },
  'template-link-builder': {
    strength: '1/5',
    coverage: '~10%',
    current: 'Generates a third-party asset URL instead of producing the asset in DataLens.',
    gap: 'The product contract implies a renderer that does not exist yet.',
    upgrade: 'Add a first-party rendering pipeline with artifact persistence.',
    fit: 'Cheap to host, but incomplete.'
  },
  'api-key-stub': {
    strength: '1/5',
    coverage: '~5%',
    current: 'Normalizes input and returns pending/null provider output only.',
    gap: 'No live provider data exists.',
    upgrade: 'Implement a real provider adapter or remove from the live catalog.',
    fit: 'Not ready until credentials and provider integration exist.'
  },
  'queued-placeholder': {
    strength: '1/5',
    coverage: '~5%',
    current: 'Returns queued/pending placeholder responses only.',
    gap: 'No job system, artifact store, or worker exists behind the response.',
    upgrade: 'Do not expose publicly until the async platform exists.',
    fit: 'Not launch-ready on free hosting.'
  }
};

function buildGithubNote(slug, src) {
  const notes = [];
  if (validationUpgradedOnGitHubMain.has(slug) && !/requireAllowedFields\(/.test(src)) {
    notes.push('GitHub main adds strict allowed-field validation; local branch lacks it.');
  }
  if (removedOnGitHubMain.has(slug)) {
    notes.push('Route exists locally but appears missing on GitHub main.');
  }
  if (notes.length === 0) {
    notes.push('No route-specific GitHub delta observed beyond the repo-wide branch lag.');
  }
  return notes.join(' ');
}

function buildEntry(slug, src, planMeta) {
  const endpoint = `/api/v1/seo-tools/${slug}`;
  const summary = planMeta ? [...planMeta.summaries][0] : 'Live route present in code but missing from dev-and-seo-tooling-list.md.';
  const override = routeOverrides[slug] ?? {};
  const cls = override.cls ?? classify(slug, src);
  const family = inferFamily(slug, summary);
  const defaults = classDefaults[cls];

  let fit = override.fit ?? defaults.fit;
  if (family === 'traffic-simulation') {
    fit = 'Poor public fit: policy-conflicted, abuse-prone, and not compliant for public launch.';
  }

  return {
    endpoint,
    cls,
    family,
    strength: override.strength ?? defaults.strength,
    coverage: override.coverage ?? defaults.coverage,
    current: override.current ?? defaults.current,
    gap: override.gap ?? defaults.gap,
    upgrade: override.upgrade ?? defaults.upgrade,
    fit,
    github: buildGithubNote(slug, src),
    summary,
    tickets: planMeta ? planMeta.tickets.join(', ') : 'missing-from-plan',
    priority: planMeta ? [...planMeta.priorities].join(' / ') : 'unplanned-live-route'
  };
}

function headingForClass(cls) {
  return {
    'audit-suite': 'Audit-Suite Routes',
    'crawler-tool': 'Crawler and Graph Routes',
    'public-api-wrapper': 'Public API Wrapper Routes',
    'network-wrapper': 'Network and Lookup Wrapper Routes',
    'html-scraper': 'HTML Scraper Routes',
    'local-utility': 'Local Utility Routes',
    'link-builder': 'Link-Builder Routes',
    'template-link-builder': 'Template/Asset URL Builder Routes',
    'api-key-stub': 'API-Key Stub Routes',
    'queued-placeholder': 'Queued Placeholder Routes'
  }[cls] ?? cls;
}

const { rows, byEndpoint } = parsePlan();

const slugs = fs.readdirSync(ROUTES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const entries = slugs.map((slug) => {
  const endpoint = `/api/v1/seo-tools/${slug}`;
  const src = fs.readFileSync(path.join(ROUTES_DIR, slug, 'route.ts'), 'utf8');
  const planMeta = byEndpoint.get(endpoint);
  return buildEntry(slug, src, planMeta);
});

const liveRoutesMissingFromPlan = entries.filter((entry) => entry.tickets === 'missing-from-plan');

const createdNoRows = rows.filter((row) => row[10] === 'No');
const notBuiltByCategory = new Map();
for (const row of createdNoRows) {
  const category = row[1];
  notBuiltByCategory.set(category, (notBuiltByCategory.get(category) ?? 0) + 1);
}

const duplicateEndpoints = [...byEndpoint.entries()].filter(([, value]) => value.tickets.length > 1);
const rawJsonCount = entries.filter((entry) => {
  const slug = entry.endpoint.split('/').pop();
  const src = fs.readFileSync(path.join(ROUTES_DIR, slug, 'route.ts'), 'utf8');
  return /JSON\.parse\(/.test(src);
}).length;
const strictAllowlistCount = entries.filter((entry) => {
  const slug = entry.endpoint.split('/').pop();
  const src = fs.readFileSync(path.join(ROUTES_DIR, slug, 'route.ts'), 'utf8');
  return /requireAllowedFields\(/.test(src);
}).length;

const classCounts = new Map();
const familyCounts = new Map();
for (const entry of entries) {
  classCounts.set(entry.cls, (classCounts.get(entry.cls) ?? 0) + 1);
  familyCounts.set(entry.family, (familyCounts.get(entry.family) ?? 0) + 1);
}

let report = '';

report += '# 2026-03-28 Deep API Forensic Analysis\n\n';
report += '## Scope\n\n';
report += '- Audit basis: current local repository on the post-integration branch, after safe fast-forward to the latest `origin/main` and replay of preserved forensic artifacts.\n';
report += '- GitHub posture: this audit reflects the integrated latest upstream platform state rather than the earlier pre-integration snapshot.\n';
report += `- Planned rows reviewed from the allowlist: ${rows.length}. Rows marked \`Created: Yes\`: ${rows.filter((row) => row[10] === 'Yes').length}. Rows marked \`Created: No\`: ${createdNoRows.length}.\n`;
report += `- Live local route directories reviewed one by one: ${entries.length}.\n`;
report += '- Important drift note: live SEO routes are now represented in the plan file, while generic operational job routes remain governed by the canonical route allowlist.\n\n';

report += '## Executive Findings\n\n';
report += '1. The repo currently has more API breadth than logic depth.\n';
report += '2. The strongest implementation area is the shared SEO audit analyzer layer in `packages/scraping-core/src/seoAudit.ts`.\n';
report += '3. The async runtime now exists, but it is still minimal and some worker outputs remain synthetic or preview-grade.\n';
report += '4. The primary blocker is now truth and governance sync across code, plan docs, allowlists, and forensic reports.\n';
report += '5. Canonical route families are present and are the right long-term direction for maintainability.\n';
report += '6. Free hosting is realistic only for a narrow allowlisted subset with launch-guard enforcement.\n';
report += '7. Traffic and fake-engagement families still require quarantine or internal-only treatment for honest public launch.\n\n';

report += '## Inventory Snapshot\n\n';
report += '| Metric | Value |\n| --- | ---: |\n';
report += `| Planned rows in allowlist | ${rows.length} |\n`;
report += `| Rows marked Created = Yes | ${rows.filter((row) => row[10] === 'Yes').length} |\n`;
report += `| Rows marked Created = No | ${createdNoRows.length} |\n`;
report += `| Live local route directories | ${entries.length} |\n`;
report += `| Routes using \`readJsonBody\` | ${entries.length} |\n`;
report += `| Routes still using raw \`JSON.parse\` locally | ${rawJsonCount} |\n`;
report += `| Routes with local strict allowed-field checks | ${strictAllowlistCount} |\n\n`;

report += '### Implementation Classes\n\n';
report += '| Class | Count |\n| --- | ---: |\n';
for (const cls of [
  'audit-suite',
  'crawler-tool',
  'public-api-wrapper',
  'network-wrapper',
  'html-scraper',
  'local-utility',
  'link-builder',
  'template-link-builder',
  'api-key-stub',
  'queued-placeholder'
]) {
  if (classCounts.has(cls)) {
    report += `| \`${cls}\` | ${classCounts.get(cls)} |\n`;
  }
}
report += '\n';

report += '### Functional Families\n\n';
report += '| Family | Count |\n| --- | ---: |\n';
for (const [family, count] of [...familyCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  report += `| \`${family}\` | ${count} |\n`;
}
report += '\n';

report += '### Duplicate Endpoints in the Plan File\n\n';
for (const [endpoint, meta] of duplicateEndpoints) {
  report += `- \`${endpoint}\`: ${meta.tickets.join(', ')}\n`;
}
report += '\n';

report += '### Planned but Not Implemented Yet\n\n';
report += '| Category | Count of `Created: No` rows |\n| --- | ---: |\n';
for (const [category, count] of [...notBuiltByCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  report += `| ${category} | ${count} |\n`;
}
report += '\n';

report += '### Live Routes Missing From Plan File\n\n';
if (liveRoutesMissingFromPlan.length === 0) {
  report += '- None.\n\n';
} else {
  for (const entry of liveRoutesMissingFromPlan) {
    report += `- \`${entry.endpoint}\`\n`;
  }
  report += '\n';
}

report += '## GitHub-First Reconciliation\n\n';
report += '- The local working branch has now been safely rebased operationally onto the latest upstream state via fast-forwarded `main` plus a clean integration branch.\n';
report += `- Strict allowed-field validation is now present on ${strictAllowlistCount} live SEO routes.\n`;
report += '- Remaining GitHub-first concerns are now about document truth and launch governance, not missing upstream platform work.\n\n';

report += '## Architecture Gaps\n\n';
report += '### 1. Source of Truth Drift\n\n';
report += '- The main remaining drift is between route-executable reality and downstream planning/forensic documents that still reference older snapshots.\n';
report += '- Developer/SEO intake planning and canonical route allowlisting now need explicit separation from generic operational routes such as jobs.\n';
report += '- The route allowlist should remain the executable source of truth, with the intake list serving as request/backlog truth.\n\n';

report += '### 2. Async Runtime Gap\n\n';
report += '- A real job contract, job status endpoint, artifact endpoint, and worker entrypoint now exist.\n';
report += '- The gap is no longer absence of runtime; the gap is that some worker implementations still produce simulated or preview-grade outputs.\n';
report += '- Queued routes should be graded individually as real, preview, internal-only, or blocked.\n\n';

report += '### 3. Shared Provider Gap\n\n';
report += '- Shared family modules now exist for site audit, keyword discovery, and domain intelligence.\n';
report += '- The remaining gap is uneven migration: many older routes still carry shallow or inline provider logic instead of using stronger family-level abstractions.\n\n';

report += '### 4. Contract / Validation Gap\n\n';
report += '- All live routes use `readJsonBody`, which is a good baseline.\n';
report += `- Raw \`JSON.parse\` usage across live SEO routes is now down to ${rawJsonCount}.\n`;
report += `- Strict allowed-field validation is present on ${strictAllowlistCount} live SEO routes.\n`;
report += '- The next contract task is to keep route metadata and route promises aligned with those stronger contracts.\n\n';

report += '### 5. Public Launch / Abuse Control Gap\n\n';
report += '- Launch guard, API-key boundary, in-memory rate limiting, and concurrency caps now exist.\n';
report += '- The gap is that those controls still need final truth-sync with docs, plus stronger durability if multi-instance or longer-lived public launch is expected.\n';
report += '- Public launch should remain narrow until blocked and simulated routes are explicitly quarantined or strengthened.\n\n';

report += '## Current Architecture Readout\n\n';
report += '### Workspace Shape\n\n';
report += '- Root workspace: `forensic-api-suite` with Turbo and npm workspaces.\n';
report += '- API entrypoint: `apps/api-gateway` running Next.js route handlers.\n';
report += '- Shared runtime code: `packages/scraping-core`.\n';
report += '- Shared types: `packages/shared-types`.\n';
report += '- Async execution service: `apps/scraper-service`, currently only a placeholder Express process.\n\n';

report += '### What Is Strong Today\n\n';
report += '- The route envelope pattern is consistent enough that response standardization is achievable.\n';
report += '- `readJsonBody` gives the repo a common request-reading baseline.\n';
report += '- `packages/scraping-core/src/seoAudit.ts` is the best reusable logic asset in the codebase.\n';
report += '- The allowlist file gives the team a practical inventory boundary for cleanup and prioritization.\n\n';

report += '### What Is Weak Today\n\n';
report += '- Route handlers are still uneven: some use strong family/platform helpers, while many weaker routes still expose shallow behavior.\n';
report += '- Durability is still lightweight: jobs and artifacts are not yet backed by a stronger shared persistence model suitable for scale.\n';
report += '- Several routes are still marketed more richly than their current implementation depth justifies.\n';
report += '- Documentation still contains older snapshot assumptions that need one more truth pass.\n\n';

report += '## Target Architecture to Max Level\n\n';
report += '### 1. Thin Gateway Layer\n\n';
report += '- Keep Next.js route handlers extremely small: validate input, call a provider/service, shape the envelope, and return.\n';
report += '- Move parsing, provider calls, normalization, and scoring out of route files.\n\n';

report += '### 2. Provider Modules by Family\n\n';
report += '- Create provider modules under `packages/scraping-core/src/providers/*`.\n';
report += '- Suggested families: `keywordProviders`, `domainProviders`, `connectorProviders`, `reviewProviders`, `geoProviders`, `performanceProviders`.\n';
report += '- Each provider should own request building, retry policy, safe parsing, DTO normalization, and error mapping.\n\n';

report += '### 3. Canonical Product Families Instead of Ticket Routes\n\n';
report += '- Merge duplicated SEO audit SKUs into one canonical `site-audit` family with `light`, `crawl`, and `rendered` modes.\n';
report += '- Merge keyword discovery SKUs into one `keyword-discovery` family with provider switches.\n';
report += '- Merge domain tools into one `domain-intelligence` family with optional submodules.\n';
report += '- Deprecate routes that are only links unless they are honestly labeled as redirect helpers.\n\n';

report += '### 4. Real Async Runtime\n\n';
report += '- Introduce a durable `Job` contract with `queued`, `running`, `succeeded`, `failed`, and `expired` states.\n';
report += '- Add `/api/v1/jobs/{id}` style status access, artifact pointers, timestamps, and structured errors.\n';
report += '- Make browser, PDF, screenshot, long crawl, and report-generation features go through workers only.\n\n';

report += '### 5. Artifact and Cache Layer\n\n';
report += '- Persist reports, screenshots, generated PDFs, and crawl results outside memory.\n';
report += '- Add a small cache for deterministic public wrappers such as autocomplete, lookups, and connectors.\n';
report += '- Cache keys should include normalized inputs and locale parameters.\n\n';

report += '### 6. Policy and Abuse-Control Layer\n\n';
report += '- Add per-route policy metadata: timeout, max URLs, max crawl pages, auth requirement, free-tier eligibility.\n';
report += '- Add API-key auth, basic IP/key throttling, and concurrency caps.\n';
report += '- Remove or quarantine traffic-simulation products from public anonymous launch.\n\n';

report += '### 7. Observability Layer\n\n';
report += '- Add request IDs, provider timing metrics, route-level error codes, and job lifecycle logging.\n';
report += '- Track provider failure rate, cache hit rate, crawl size, and artifact generation cost.\n\n';

report += '## Free-Hosting Deployment Blueprint\n\n';
report += '### Phase 1: What Can Realistically Run on a Free Server\n\n';
report += '- Public wrappers with tiny payloads and deterministic parsing.\n';
report += '- Lightweight HTML-only audits on single pages.\n';
report += '- Small local utilities such as markdown generation or text transforms.\n';
report += '- Narrow network checks with very small input caps.\n\n';

report += '### Phase 2: What Should Be Disabled Until Paid or Worker-Backed\n\n';
report += '- Multi-page crawls over more than a tiny page cap.\n';
report += '- Lighthouse, screenshot, PDF, and rendered-browser features.\n';
report += '- Large provider fan-out queries or bulk enrichment workflows.\n';
report += '- Any traffic, engagement, or view-generation route.\n\n';

report += '### Minimal Free-Tier Topology\n\n';
report += '- One small stateless gateway for synchronous lightweight routes.\n';
report += '- One tiny persistent store for job metadata and cached responses.\n';
report += '- Zero public exposure for unfinished queued routes until the worker exists.\n';
report += '- Hard caps everywhere: input size, URL count, crawl depth, concurrency, and timeout.\n\n';

report += '### What You Need Before Public Launch\n\n';
report += '- Canonical route families instead of ticket-by-ticket surface sprawl.\n';
report += '- Real auth and throttling.\n';
report += '- A tiny but durable job store.\n';
report += '- One worker execution path for browser and long-running features.\n';
report += '- Honest docs that separate lite routes from full product routes.\n\n';

report += '## Priority Remediation Ladder\n\n';
report += '1. Sync local with GitHub `main` and resolve route inventory drift before adding more APIs.\n';
report += '2. Replace raw `JSON.parse` usage with safe parsing and strict allowed-field validation everywhere.\n';
report += '3. Collapse duplicate audit and keyword routes into canonical families.\n';
report += '4. Remove, hide, or relabel all link-only routes that currently over-promise.\n';
report += '5. Build the real job runtime before exposing any queued placeholder as a product.\n';
report += '6. Add auth, throttling, and route policy metadata before any free public launch.\n';
report += '7. Rewrite stale architecture docs so the repo tells the truth about itself.\n\n';

report += '## Free Hosting Reality Check\n\n';
report += '| Workload Type | Reality on Free Hosting | Recommendation |\n';
report += '| --- | --- | --- |\n';
report += '| Lightweight public JSON wrappers and small HTML scrapers | Realistic on Vercel/Cloudflare if capped tightly | Keep them lightweight, add cache and throttling |\n';
report += '| Multi-page crawls | Borderline because the current code is synchronous and sequential | Keep tiny on free tier or move behind async jobs |\n';
report += '| Browser audits, Lighthouse, screenshots, PDFs | Not realistic as synchronous free-tier public endpoints | Build a real async worker plus artifact storage |\n';
report += '| Traffic and fake-engagement tools | Policy-conflicted and abuse-prone | Remove from public launch or repurpose into compliant owned-site QA only |\n';
report += '| Public anonymous launch without auth/rate limits | Not safe | Add API keys, IP/key throttling, and per-tool policies first |\n\n';

report += '## Route-by-Route Appendix\n\n';
report += 'The appendix below covers each live local route one by one. The assessments are based on the actual route file plus the current promise in `dev-and-seo-tooling-list.md`.\n\n';

for (const cls of [
  'audit-suite',
  'crawler-tool',
  'public-api-wrapper',
  'network-wrapper',
  'html-scraper',
  'local-utility',
  'link-builder',
  'template-link-builder',
  'api-key-stub',
  'queued-placeholder'
]) {
  const group = entries.filter((entry) => entry.cls === cls);
  if (group.length === 0) continue;

  report += `## ${headingForClass(cls)}\n\n`;
  report += '| Endpoint | Promise | Strength | Coverage | Current Logic | Biggest Gap | Best-Ever Upgrade | Free-Tier Fit | GitHub Note |\n';
  report += '| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';

  for (const entry of group) {
    report += `| \`${escapeCell(entry.endpoint)}\` | ${escapeCell(entry.summary)} | ${escapeCell(entry.strength)} | ${escapeCell(entry.coverage)} | ${escapeCell(entry.current)} | ${escapeCell(entry.gap)} | ${escapeCell(entry.upgrade)} | ${escapeCell(entry.fit)} | ${escapeCell(entry.github)} |\n`;
  }

  report += '\n';
}

fs.writeFileSync(REPORT_PATH, report, 'utf8');
console.log(`wrote ${REPORT_PATH}`);
