import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const PORT = process.env.REGRESSION_PORT ?? '3102';
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // retry
    }
    await wait(500);
  }

  throw new Error('regression server did not become ready in time');
}

async function post(path, payload) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return { response, json: await response.json() };
}

function assertLinkBuilderContract(data) {
  assert.equal(data.contract.forensicCategory, 'link-builder');
  assert.equal(data.contract.implementationDepth, 'helper');
  assert.equal(typeof data.contract.productLabel, 'string');
  assert.equal(typeof data.contract.notes, 'string');
}

function assertHtmlScraperContract(data) {
  assert.equal(data.contract.forensicCategory, 'html-scraper');
  assert.equal(data.contract.implementationDepth, 'live');
  assert.equal(data.contract.launchRecommendation, 'public_lite');
  assert.equal(typeof data.contract.productLabel, 'string');
  assert.equal(typeof data.contract.notes, 'string');
}

function assertNetworkWrapperContract(data) {
  assert.equal(data.contract.forensicCategory, 'network-wrapper');
  assert.equal(data.contract.implementationDepth, 'live');
  assert.equal(data.contract.launchRecommendation, 'public_lite');
  assert.equal(typeof data.contract.productLabel, 'string');
  assert.equal(typeof data.contract.notes, 'string');
}

function assertPublicApiWrapperContract(data) {
  assert.equal(data.contract.forensicCategory, 'public-api-wrapper');
  assert.equal(data.contract.implementationDepth, 'live');
  assert.equal(data.contract.launchRecommendation, 'public_lite');
  assert.equal(typeof data.contract.productLabel, 'string');
  assert.equal(typeof data.contract.notes, 'string');
}

function assertProviderTemplateContract(data) {
  assert.equal(data.status, 'internal_provider_template');
  assert.equal(data.provider?.credentialsRequired, true);
  assert.equal(data.provider?.executionState, 'not_executed');
  assert.equal(data.contract?.forensicCategory, 'api-key-stub');
  assert.equal(data.contract?.implementationDepth, 'template');
  assert.equal(data.contract?.launchRecommendation, 'internal_only_until_provider_integration');
  assert.equal(typeof data.contract?.notes, 'string');
}

function stopProcess(child, label) {
  if (child.exitCode !== null || child.killed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const fallback = setTimeout(() => {
      process.stderr.write(`[regression:cleanup] forcing ${label} shutdown\n`);
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }, 5000);

    child.once('exit', () => {
      clearTimeout(fallback);
      resolve();
    });

    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  });
}

const server = spawn('npm', ['--workspace', 'api-gateway', 'run', 'dev', '--', '-p', PORT], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
  env: {
    ...process.env,
    FREE_TIER_LAUNCH_MODE: 'false'
  }
});

server.stdout.on('data', (chunk) => process.stdout.write(`[regression:next] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[regression:next] ${chunk}`));

try {
  await waitForServer(`${BASE_URL}/api/v1/seo-tools/spotify`, 60000);

  const cases = [
    ['/api/v1/seo-tools/similarweb', { domain: 'example.com' }, 'reportUrl'],
    ['/api/v1/seo-tools/spotify', { query: 'indie jazz' }, 'searchUrl']
  ];

  for (const [path, payload, field] of cases) {
    const result = await post(path, payload);
    assert.equal(result.response.status, 200, `${path} status`);
    assert.equal(result.json.success, true, `${path} success`);
    assert.ok(result.json.data[field], `${path} expected field ${field}`);
    assertLinkBuilderContract(result.json.data);
  }

  const businessRanker = await post('/api/v1/seo-tools/business-websites-ranker', {
    keyword: 'openai',
    location: 'san francisco'
  });
  assert.equal(businessRanker.response.status, 200);
  assert.equal(businessRanker.json.success, true);
  assert.equal(businessRanker.json.data.source, 'duckduckgo_html_search');
  assert.equal(typeof businessRanker.json.data.searchUrl, 'string');
  assert.ok(businessRanker.json.data.searchUrl.includes('duckduckgo.com/html'));
  assert.equal(typeof businessRanker.json.data.candidateCount, 'number');
  assert.ok(businessRanker.json.data.candidateCount >= 1);
  assert.equal(typeof businessRanker.json.data.analyzedCount, 'number');
  assert.ok(businessRanker.json.data.analyzedCount >= 1);
  assert.equal(Array.isArray(businessRanker.json.data.rankedBusinesses), true);
  assert.ok(businessRanker.json.data.rankedBusinesses.length >= 1);
  assert.equal(typeof businessRanker.json.data.rankedBusinesses[0].websiteUrl, 'string');
  assert.equal(typeof businessRanker.json.data.rankedBusinesses[0].qualityScore, 'number');
  assert.equal(typeof businessRanker.json.data.rankedBusinesses[0].underperforming, 'boolean');
  assert.equal(businessRanker.json.data.rankedBusinesses[0].evidence.websiteFetched, true);
  assertHtmlScraperContract(businessRanker.json.data);

  const openPageRank = await post('/api/v1/seo-tools/openpagerank-bulk-checker', {
    domains: ['example.com', 'openai.com']
  });
  assert.equal(openPageRank.response.status, 200);
  assert.equal(openPageRank.json.success, true);
  assertProviderTemplateContract(openPageRank.json.data);
  assert.equal(Array.isArray(openPageRank.json.data.results), true);
  assert.equal(openPageRank.json.data.results.length, 2);
  assert.equal(openPageRank.json.data.results[0].status, 'provider_credentials_required');

  const rentcast = await post('/api/v1/seo-tools/rentcast', {
    address: '1600 Pennsylvania Ave NW, Washington, DC'
  });
  assert.equal(rentcast.response.status, 200);
  assert.equal(rentcast.json.success, true);
  assertProviderTemplateContract(rentcast.json.data);
  assert.equal(typeof rentcast.json.data.lookupUrl, 'string');
  assert.ok(rentcast.json.data.lookupUrl.includes('rentcast.io'));

  const youtubeRegion = await post('/api/v1/seo-tools/youtube-region-restriction-checker', {
    videoId: 'dQw4w9WgXcQ'
  });
  assert.equal(youtubeRegion.response.status, 200);
  assert.equal(youtubeRegion.json.success, true);
  assert.equal(youtubeRegion.json.data.status, 'analyzed');
  assert.equal(youtubeRegion.json.data.source, 'youtube_watch_player_response');
  assert.equal(youtubeRegion.json.data.playabilityStatus, 'OK');
  assert.equal(Array.isArray(youtubeRegion.json.data.availableCountries), true);
  assert.ok(youtubeRegion.json.data.availableCountries.length > 50);
  assert.ok(youtubeRegion.json.data.availableCountries.includes('US'));
  assert.equal(youtubeRegion.json.data.evidence.watchPageFetched, true);
  assert.equal(youtubeRegion.json.data.evidence.playerResponseParsed, true);
  assertHtmlScraperContract(youtubeRegion.json.data);

  const trustpilot = await post('/api/v1/seo-tools/trustpilot-plus', {
    company: 'openai.com'
  });
  assert.equal(trustpilot.response.status, 200);
  assert.equal(trustpilot.json.success, true);
  assert.equal(trustpilot.json.data.status, 'analyzed');
  assert.equal(trustpilot.json.data.source, 'trustpilot_review_html');
  assert.equal(trustpilot.json.data.reviewIdentifier, 'openai.com');
  assert.equal(typeof trustpilot.json.data.reviewUrl, 'string');
  assert.ok(trustpilot.json.data.reviewUrl.includes('/review/openai.com'));
  assert.equal(typeof trustpilot.json.data.trustScore, 'number');
  assert.ok(trustpilot.json.data.trustScore > 0);
  assert.equal(typeof trustpilot.json.data.reviewCount, 'number');
  assert.ok(trustpilot.json.data.reviewCount > 100);
  assert.equal(trustpilot.json.data.evidence.reviewPageFetched, true);
  assert.equal(trustpilot.json.data.evidence.aggregateRatingParsed, true);
  assertHtmlScraperContract(trustpilot.json.data);

  const bbb = await post('/api/v1/seo-tools/simple-bbb', {
    company: 'openai'
  });
  assert.equal(bbb.response.status, 200);
  assert.equal(bbb.json.success, true);
  assert.equal(bbb.json.data.status, 'analyzed');
  assert.equal(typeof bbb.json.data.searchUrl, 'string');
  assert.ok(bbb.json.data.searchUrl.includes('bbb.org/search'));
  assert.equal(Array.isArray(bbb.json.data.results), true);
  assert.ok(bbb.json.data.results.length >= 1);
  assert.equal(typeof bbb.json.data.bestMatch?.profileUrl, 'string');
  assert.ok(bbb.json.data.bestMatch.profileUrl.includes('bbb.org'));
  assert.equal(typeof bbb.json.data.profile?.bbbRating, 'string');
  assert.ok(bbb.json.data.profile.bbbRating.length >= 1);
  assert.equal(Array.isArray(bbb.json.data.profile?.ratingReasons), true);
  assert.ok(bbb.json.data.profile.ratingReasons.length >= 1);
  assert.equal(typeof bbb.json.data.profile?.complaintsFiledCount, 'number');
  assert.ok(bbb.json.data.profile.complaintsFiledCount > 0);
  assert.equal(bbb.json.data.evidence.searchPageFetched, true);
  assert.equal(bbb.json.data.evidence.profilePageFetched, true);
  assert.equal(bbb.json.data.evidence.structuredDataParsed, true);
  assert.equal(bbb.json.data.evidence.webDigitalDataParsed, true);
  assertHtmlScraperContract(bbb.json.data);

  const bulkBbb = await post('/api/v1/seo-tools/bulk-bbb', {
    companies: ['openai', 'openai']
  });
  assert.equal(bulkBbb.response.status, 200);
  assert.equal(bulkBbb.json.success, true);
  assert.equal(bulkBbb.json.data.requestedCount, 2);
  assert.equal(bulkBbb.json.data.analyzedCount, 2);
  assert.equal(bulkBbb.json.data.errorCount, 0);
  assert.equal(Array.isArray(bulkBbb.json.data.results), true);
  assert.equal(bulkBbb.json.data.results.length, 2);
  for (const result of bulkBbb.json.data.results) {
    assert.equal(result.status, 'analyzed');
    assert.equal(typeof result.bestMatch?.profileUrl, 'string');
    assert.equal(typeof result.profile?.bbbRating, 'string');
    assert.equal(typeof result.profile?.complaintsFiledCount, 'number');
    assert.ok(result.profile.complaintsFiledCount > 0);
    assert.equal(result.evidence.profilePageFetched, true);
  }
  assertHtmlScraperContract(bulkBbb.json.data);

  const shopify = await post('/api/v1/seo-tools/shopify-product-search', {
    storeUrl: 'https://colourpop.com',
    query: 'lip'
  });
  assert.equal(shopify.response.status, 200);
  assert.equal(shopify.json.success, true);
  assert.equal(shopify.json.data.status, 'live_search');
  assert.equal(typeof shopify.json.data.source, 'string');
  assert.ok(shopify.json.data.source.startsWith('shopify_'));
  assert.equal(typeof shopify.json.data.sourceUrl, 'string');
  assert.ok(shopify.json.data.sourceUrl.includes('colourpop.com'));
  assert.equal(typeof shopify.json.data.productCount, 'number');
  assert.ok(shopify.json.data.productCount >= 1);
  assert.equal(Array.isArray(shopify.json.data.products), true);
  assert.ok(shopify.json.data.products.length >= 1);
  assert.equal(typeof shopify.json.data.products[0].title, 'string');
  assert.equal(typeof shopify.json.data.products[0].productUrl, 'string');
  assert.ok(shopify.json.data.products[0].productUrl.includes('colourpop.com'));
  assert.equal(typeof shopify.json.data.evidence.liveProductsFeedFallback, 'boolean');
  assert.equal(typeof shopify.json.data.evidence.livePredictiveSearch, 'boolean');
  assertPublicApiWrapperContract(shopify.json.data);

  const spellChecker = await post('/api/v1/seo-tools/spell-checker', {
    text: 'Ths is a speling test',
    language: 'en-US'
  });
  assert.equal(spellChecker.response.status, 200);
  assert.equal(spellChecker.json.success, true);
  assert.equal(spellChecker.json.data.status, 'analyzed');
  assert.equal(spellChecker.json.data.source, 'languagetool_public_api');
  assert.equal(spellChecker.json.data.language, 'en-US');
  assert.equal(typeof spellChecker.json.data.textLength, 'number');
  assert.ok(spellChecker.json.data.textLength >= 10);
  assert.equal(typeof spellChecker.json.data.matchCount, 'number');
  assert.ok(spellChecker.json.data.matchCount >= 1);
  assert.equal(Array.isArray(spellChecker.json.data.matches), true);
  assert.ok(spellChecker.json.data.matches.length >= 1);
  assert.equal(typeof spellChecker.json.data.matches[0].message, 'string');
  assert.equal(Array.isArray(spellChecker.json.data.matches[0].replacements), true);
  assert.ok(spellChecker.json.data.matches.some((match) => match.replacements.length > 0));
  assert.equal(spellChecker.json.data.evidence.publicApiChecked, true);
  assert.equal(typeof spellChecker.json.data.evidence.replacementsIncluded, 'boolean');
  assertPublicApiWrapperContract(spellChecker.json.data);

  const whatSite = await post('/api/v1/seo-tools/what-site', {
    url: 'https://openai.com'
  });
  assert.equal(whatSite.response.status, 200);
  assert.equal(whatSite.json.success, true);
  assert.equal(whatSite.json.data.status, 'analyzed');
  assert.equal(whatSite.json.data.requestedCount, 1);
  assert.equal(whatSite.json.data.analyzedCount, 1);
  assert.equal(whatSite.json.data.errorCount, 0);
  assert.equal(Array.isArray(whatSite.json.data.results), true);
  assert.equal(whatSite.json.data.results.length, 1);
  assert.equal(whatSite.json.data.results[0].status, 'analyzed');
  assert.equal(typeof whatSite.json.data.results[0].finalUrl, 'string');
  assert.ok(whatSite.json.data.results[0].finalUrl.includes('openai.com'));
  assert.equal(typeof whatSite.json.data.results[0].statusCode, 'number');
  assert.ok(whatSite.json.data.results[0].statusCode >= 200);
  assert.equal(typeof whatSite.json.data.results[0].title, 'string');
  assert.ok(whatSite.json.data.results[0].title.length >= 1);
  assert.equal(typeof whatSite.json.data.results[0].content.wordCount, 'number');
  assert.ok(whatSite.json.data.results[0].content.wordCount > 50);
  assert.equal(typeof whatSite.json.data.results[0].headings.totalHeadings, 'number');
  assert.ok(whatSite.json.data.results[0].headings.totalHeadings >= 1);
  assert.equal(typeof whatSite.json.data.results[0].links.internalCount, 'number');
  assert.ok(whatSite.json.data.results[0].links.internalCount >= 1);
  assert.equal(whatSite.json.data.results[0].evidence.htmlFetched, true);
  assertHtmlScraperContract(whatSite.json.data);

  const cmsChecker = await post('/api/v1/seo-tools/cms-checker', {
    url: 'https://colourpop.com'
  });
  assert.equal(cmsChecker.response.status, 200);
  assert.equal(cmsChecker.json.success, true);
  assert.equal(cmsChecker.json.data.status, 'analyzed');
  assert.equal(cmsChecker.json.data.requestedCount, 1);
  assert.equal(cmsChecker.json.data.analyzedCount, 1);
  assert.equal(cmsChecker.json.data.errorCount, 0);
  assert.equal(Array.isArray(cmsChecker.json.data.results), true);
  assert.equal(cmsChecker.json.data.results.length, 1);
  assert.equal(cmsChecker.json.data.results[0].status, 'analyzed');
  assert.equal(Array.isArray(cmsChecker.json.data.results[0].cms), true);
  assert.ok(cmsChecker.json.data.results[0].cms.includes('Shopify'));
  assert.equal(Array.isArray(cmsChecker.json.data.results[0].technologies), true);
  assert.ok(cmsChecker.json.data.results[0].technologies.includes('Shopify'));
  assert.equal(cmsChecker.json.data.results[0].evidence.htmlFetched, true);
  assertHtmlScraperContract(cmsChecker.json.data);

  const whatRuns = await post('/api/v1/seo-tools/whatruns', {
    url: 'https://colourpop.com'
  });
  assert.equal(whatRuns.response.status, 200);
  assert.equal(whatRuns.json.success, true);
  assert.equal(whatRuns.json.data.status, 'analyzed');
  assert.equal(whatRuns.json.data.requestedCount, 1);
  assert.equal(whatRuns.json.data.analyzedCount, 1);
  assert.equal(whatRuns.json.data.errorCount, 0);
  assert.equal(Array.isArray(whatRuns.json.data.results), true);
  assert.equal(whatRuns.json.data.results.length, 1);
  assert.equal(whatRuns.json.data.results[0].status, 'analyzed');
  assert.equal(Array.isArray(whatRuns.json.data.results[0].technologies), true);
  assert.ok(whatRuns.json.data.results[0].technologies.includes('Shopify'));
  assert.equal(Array.isArray(whatRuns.json.data.results[0].categories.cms), true);
  assert.ok(whatRuns.json.data.results[0].categories.cms.includes('Shopify'));
  assert.equal(whatRuns.json.data.results[0].evidence.htmlFetched, true);
  assertHtmlScraperContract(whatRuns.json.data);

  const domainIntelligence = await post('/api/v1/seo-tools/domain-intelligence-suite', {
    domain: 'openai.com'
  });
  assert.equal(domainIntelligence.response.status, 200);
  assert.equal(domainIntelligence.json.success, true);
  assert.equal(domainIntelligence.json.data.mode, 'light');
  assert.equal(domainIntelligence.json.data.evidence.liveDns, true);
  assert.equal(domainIntelligence.json.data.evidence.liveHttp, true);
  assert.equal(Array.isArray(domainIntelligence.json.data.domains), true);
  assert.equal(domainIntelligence.json.data.domains.length, 1);
  assert.equal(domainIntelligence.json.data.domains[0].domain, 'openai.com');
  assert.equal(Array.isArray(domainIntelligence.json.data.domains[0].dns.aRecords), true);
  assert.ok(domainIntelligence.json.data.domains[0].dns.aRecords.length >= 1);
  assert.equal(Array.isArray(domainIntelligence.json.data.domains[0].dns.matrix), true);
  assert.ok(domainIntelligence.json.data.domains[0].dns.matrix.length >= 4);
  assert.equal(typeof domainIntelligence.json.data.domains[0].http.finalUrl, 'string');
  assertNetworkWrapperContract(domainIntelligence.json.data);

  console.log('regression-tests: canonical families ok');
} finally {
  await stopProcess(server, 'api-gateway');
}
