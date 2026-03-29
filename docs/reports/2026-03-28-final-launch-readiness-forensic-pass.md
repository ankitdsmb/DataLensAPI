# Final Launch-Readiness Forensic Pass

Date: 2026-03-29

## Scope and method

This pass re-audits **every live API route** by scanning the actual route tree under:

- `apps/api-gateway/app/api/v1/**/route.ts`

Outputs produced in this pass:

1. Route-by-route classification CSV: `docs/reports/2026-03-28-launch-readiness-route-classification.csv`
2. This launch gate narrative report.

Classification dimensions applied per route:

- **Strength** (`strong`, `medium`, `weak`)
- **Coverage** (inferred via `forensic_category` + implementation depth)
- **Free-tier fit** (matches `FREE_TIER_SAFE_ROUTES` vs blocked/non-allowlisted)
- **Launch readiness** (`ready`, `conditional`, `internal-only`, `blocked`)
- **Concrete next action** (`strengthen`, `relabel`, `internal-only`, `remove`-equivalent handled via blocker/action list)

## Route tree re-audit results

- Live routes detected from code: **154**
- Route-by-route rows produced: **154**

Classification summary:

- **Strength**
  - Strong: **16**
  - Medium: **106**
  - Weak: **32**
- **Launch readiness**
  - Ready: **89**
  - Conditional: **46**
  - Internal-only: **5**
  - Blocked: **14**
- **Free-tier fit**
  - Fit (in explicit safe allowlist): **10**
  - Blocked: **19** (12 rejected traffic/fake-engagement routes + 5 internal-only routes + 2 api-key-stub routes)
  - Not in free-tier allowlist: **125**

## Route tree vs allowlist verification

Compared live code routes against `docs/api-plans/route-allowlist.md`.

- Routes in code but missing from allowlist: **0**
- Routes in allowlist but missing from code: **0**

## Docs vs actual code verification

### Confirmed doc drift

1. The major allowlist count drift has been corrected: the canonical route allowlist now reflects all 154 live routes.
2. This phase sync closes the targeted plan drift: helper-only travel/search routes, provider templates, internal-preview async routes, and the deprecated compatibility stub now have matching contracts and docs.
3. Launch-facing docs must keep distinguishing between:
   - template/provider-stub routes,
   - real async orchestration surfaces,
   - and fully implemented worker outputs.

## Verification evidence

Current branch verification is recorded in:

- `docs/reports/2026-03-29-qa-verification-pass.md`

Verified commands:

- `npm run contract-tests`
- `npm run smoke-tests`
- `npm run regression-tests`

What this evidence now covers:

- shared response envelope and validation behavior,
- async job submission/completion/artifact retrieval for `youtube-rank-checker`,
- public watch-page availability evidence for `youtube-region-restriction-checker`,
- public Trustpilot review-page aggregate evidence for `trustpilot-plus`,
- public barcode product evidence for `barcode` (with product-page fallback when the API rate-limits),
- deterministic markdown table generation evidence for `markdown-table-generator`,
- deterministic platform-aware hashtag generation evidence for `social-media-hashtag-generator`,
- first-party SVG open graph generation evidence for `open-graph-image-generator`,
- local n-gram plagiarism evidence for `plagiarism-checker`,
- deterministic SEO title generation evidence for `serp-meta-title-generator`,
- deterministic topic clustering evidence for `topic-trend-aggregator`,
- live light domain availability evidence for `domain-availability-expiry-whois-dns-ip-asn-70-tld`,
- public Google News RSS article evidence for `trending-news`,
- public App Store similar-app shelf evidence for `similar-app-store-applications-finder`,
- public OpenTable restaurant search-state evidence for `opentable`,
- public Zapier app-integrations page evidence for `zapier`,
- shared first-party light SEO audit evidence for `woorank`,
- shared first-party homepage audit plus live domain-check evidence for `seobility-ranking-seo`,
- first-party proxy authority and spam-risk evidence for `moz-da-pa-spam-checker`,
- local profanity moderation evidence for `profanity-checker`,
- public CMS/site-stack fingerprint evidence for `cms-checker`,
- public Shopify storefront product evidence for `shopify-product-search`,
- public spelling and grammar evidence for `spell-checker`,
- public GA4 tag evidence for `ga4-mcp`,
- public site-profile evidence for `what-site`,
- public multi-category technology fingerprint evidence for `whatruns`,
- public BBB bulk company evidence for `bulk-bbb`,
- public business website discovery/scoring evidence for `business-websites-ranker`,
- public BBB company-profile evidence for `simple-bbb`,
- live DNS and HTTPS evidence extraction for `domain-intelligence-suite`,
- Tranco-backed global popularity evidence for `top-1000-websites-worldwide-country-level`,
- profile-lite helper behavior for `x-twitter`,
- explicit helper-only posture for `showtimes`,
- shared travel-helper compatibility behavior for `car-hire-rental` and `car-hire-rental-bulk`,
- compatibility-wrapper posture for `spotify-plus` and `spyfu-bulk-urls`,
- public gateway blocking plus internal worker execution for `snapify-capture-screenshot-save-pdf`,
- deprecated internal-template quarantine for `trayvmy-actor`,
- provider-template contract assertions for `openpagerank-bulk-checker` and `rentcast`.

## Explicitly excluded from the supported public subset

### Provider-template routes remain intentionally non-public

- `/api/v1/seo-tools/openpagerank-bulk-checker` (`api-key-stub`)
- `/api/v1/seo-tools/rentcast` (`api-key-stub`)

These routes are now explicitly classified as internal provider templates rather than ambiguous pending APIs.
For the current supported subset, they are treated as deliberate internal templates by default rather than near-term public candidates.

### Internal-preview async routes remain intentionally non-public

- `/api/v1/seo-tools/snapify-capture-screenshot-save-pdf`
- `/api/v1/seo-tools/youtube-rank-checker`

These routes now have a real async submission and job-status surface, and both have been strengthened beyond pure placeholders. `snapify-capture-screenshot-save-pdf` now renders browser-backed screenshot/PDF artifacts internally, while `youtube-rank-checker` now uses multi-strategy search evidence parsing with provenance but still degrades to simulation when live evidence is unavailable. They remain internal-only because browser execution controls, artifact retention, and preview-route safeguards are still intentionally tighter than the public subset.

### Rejected traffic and fake-engagement routes remain blocked by design

The repo now enforces launch governance in code for the highest-risk traffic and fake-engagement class, including:

- traffic simulation routes such as `traffic-booster`, `smart-website-traffic`, and `website-traffic-generator-pro`
- fake-engagement routes such as `youtube-view-generator` and `youtube-view-generator-124-test-events-124-0001`

These are now explicitly rejected from the public catalog in both route responses and launch guard enforcement.

### Deprecated compatibility-only carryover remains internal

- `/api/v1/seo-tools/trayvmy-actor`

This route is now explicitly documented and classified as an internal deprecated compatibility stub. It is no longer part of the public product story.

## Weak-route action plan (concrete)

The remaining weak routes are now concentrated mostly in:

- `link-builder` helpers
- very small local transform utilities
- provider templates that are still blocked from public launch

Notably, the domain family no longer belongs in that bucket:

- `/api/v1/seo-tools/domain-availability-checker`
- `/api/v1/seo-tools/domain-checker`
- `/api/v1/seo-tools/domain-inspector`
- `/api/v1/seo-tools/domain-intelligence-suite`

These routes now sit in a medium-depth, evidence-backed conditional posture because they perform live DNS and/or HTTP inspection, even though product depth is still incomplete relative to their broader marketing promises.

`/api/v1/seo-tools/trustpilot-plus` also no longer belongs in the weak helper bucket. It now performs direct review-page evidence extraction for resolvable Trustpilot identifiers and should be treated as a medium-depth conditional route rather than a pure link builder.

`/api/v1/seo-tools/bulk-bbb` also no longer belongs in the weak helper bucket. It now performs capped bulk BBB search parsing plus best-match business-profile enrichment with rating and complaint signals for each input company.

`/api/v1/seo-tools/business-websites-ranker` also no longer belongs in the weak helper bucket. It now discovers public websites from search results and applies lightweight website-quality scoring instead of only emitting a seed query URL.

`/api/v1/seo-tools/simple-bbb` also no longer belongs in the weak helper bucket. It now performs public BBB search parsing plus first-match business-profile enrichment with rating and complaint signals.

`/api/v1/seo-tools/shopify-product-search` also no longer belongs in the weak helper bucket when `storeUrl` is supplied. It now calls public Shopify storefront endpoints and returns normalized product evidence instead of only returning a search helper URL.

`/api/v1/seo-tools/ga4-mcp` also no longer belongs in the weak helper bucket. It now fetches public HTML and inspects GA4 measurement ids plus gtag/GTM implementation evidence instead of returning queued placeholder responses.

`/api/v1/seo-tools/zapier` also no longer belongs in the weak helper bucket. It now fetches the public Zapier app integrations page for a resolvable app slug and extracts app metadata plus visible integration-card evidence instead of only returning a search helper URL.

`/api/v1/seo-tools/what-site` now materially exceeds its original title/description lookup promise. It returns a lightweight site profile with metadata, heading, link, and content signals, which makes it a stronger ready route than before.

`/api/v1/seo-tools/top-1000-websites-worldwide-country-level` also no longer belongs in the fake-queued bucket. It now returns a synchronous Tranco-backed global popularity snapshot and honestly treats country-level behavior as compatibility-only.

`/api/v1/seo-tools/x-twitter` has been narrowed into a profile-lite helper posture and should no longer be described as a general tweet or search extraction route.

The travel-helper family (`car-hire-rental`, `car-hire-rental-bulk`, `skyscanner-cars`, `skyscanner-hotels`, `tripadvisor-cruises`, `tripadvisor-hotels`, `vrbo`) has also been standardized as helper-only compatibility behavior rather than live travel inventory extraction.

Action policy for the remaining weak routes:

1. **Relabel** as helper/lite utilities where output is URL generation or minimal transformation.
2. **Strengthen** where the product promise requires real external retrieval or analysis.
3. **Internal-only** for risky or abuse-prone classes until hardening is complete.
4. **Remove** if a route has low product value and no believable hardening path.

(Per-route action assignment is in `docs/reports/2026-03-28-launch-readiness-route-classification.csv`.)

## Launch gate decision

## ✅ GO FOR THE SUPPORTED SUBSET (as of 2026-03-29)

Rationale:

1. Route inventory, allowlist, contracts, and launch-facing docs are aligned for the supported subset.
2. The phase-plan routes that were ambiguous are now explicitly classified as helper-only, compatibility-only, internal-preview, provider-template, or deprecated internal-only.
3. Contract, smoke, and regression suites now exercise the relevant public subset plus the intentionally non-public exclusions.
4. Blocked/internal-only routes remain excluded by design instead of by ambiguity.
5. Shared API/provider timing has been hardened onto a monotonic clock, so launch-facing observability no longer inherits the earlier negative-duration wall-clock glitch.

This is **not** a GO for every live route. It is a GO for the intentionally supported public subset, with blocked/internal-only routes excluded from launch by policy and documentation.

## Expansion criteria for next pass

Route expansion beyond the supported public subset should happen only when all are true:

1. Provider-template routes are either integrated for real or intentionally kept internal-only.
2. Internal-preview async routes are upgraded to provider-grade execution before any public graduation.
3. Rejected traffic/fake-engagement routes remain excluded consistently across route contracts, launch guard policy, and launch docs.
4. Additional weak/helper routes are expanded only when a believable public-data or first-party path exists.
