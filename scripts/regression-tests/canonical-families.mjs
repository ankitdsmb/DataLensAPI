import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';

async function resolvePort(preferredPort) {
  if (preferredPort) {
    const preferred = Number(preferredPort);
    const claimed = await tryClaimPort(preferred);
    if (claimed) {
      return String(claimed);
    }
  }

  return String(await claimEphemeralPort());
}

function tryClaimPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(null));
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const claimed = typeof address === 'object' && address ? address.port : port;
      server.close(() => resolve(claimed));
    });
  });
}

function claimEphemeralPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address !== 'object' || !address) {
        server.close(() => reject(new Error('failed to allocate ephemeral port')));
        return;
      }

      server.close(() => resolve(address.port));
    });
  });
}

const PORT = process.env.REGRESSION_PORT ?? await resolvePort('3102');
const BASE_URL = `http://127.0.0.1:${PORT}`;
const FIXTURE_PORT =
  process.env.REGRESSION_FIXTURE_PORT ?? (await resolvePort(String(Number(PORT) + 1)));
const FIXTURE_BASE = `http://127.0.0.1:${FIXTURE_PORT}`;
const FIXTURE_URL = `${FIXTURE_BASE}/ga4-fixture`;

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

async function post(path, payload, extraHeaders = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...extraHeaders
    },
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

function assertShallowHelperContract(data) {
  assert.equal(data.contract.forensicCategory, 'shallow-local-utility');
  assert.equal(data.contract.implementationDepth, 'helper');
  assert.equal(data.contract.launchRecommendation, 'public_lite');
  assert.equal(typeof data.contract.productLabel, 'string');
  assert.equal(typeof data.contract.notes, 'string');
}

function assertProviderTemplateContract(data, expectedProviderName) {
  assert.equal(data.status, 'internal_provider_template');
  assert.equal(data.provider?.credentialsRequired, true);
  assert.equal(data.provider?.executionState, 'not_executed');
  if (expectedProviderName) {
    assert.equal(data.provider?.name, expectedProviderName);
  }
  assert.equal(data.contract?.forensicCategory, 'api-key-stub');
  assert.equal(data.contract?.implementationDepth, 'template');
  assert.equal(data.contract?.launchRecommendation, 'internal_only_provider_template');
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

function closeServer(server, label) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(new Error(`${label} shutdown failed: ${error.message}`));
        return;
      }

      resolve();
    });
  });
}

const fixtureServer = http.createServer((req, res) => {
  if (req.url === '/tranco/api/lists/date/latest') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      list_id: 'TEST-LATEST',
      available: true,
      download: `${FIXTURE_BASE}/tranco/download/latest.csv`,
      created_on: '2026-03-29T00:00:00.000000'
    }));
    return;
  }

  if (req.url === '/tranco/download/latest.csv') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end([
      '1,google.com',
      '2,youtube.com',
      '3,facebook.com',
      '4,openai.com',
      '5,wikipedia.org'
    ].join('\n'));
    return;
  }

  if (req.url !== '/ga4-fixture') {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html lang="en">
  <head>
    <title>GA4 Fixture</title>
    <meta name="description" content="Local GA4 regression fixture">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST1234"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-TEST1234');
    </script>
    <script>
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});})(window,document,'script','dataLayer','GTM-TEST456');
    </script>
  </head>
  <body>
    <h1>GA4 Fixture</h1>
    <p>Regression evidence page.</p>
  </body>
</html>`);
});

await new Promise((resolve, reject) => {
  fixtureServer.listen(Number(FIXTURE_PORT), '127.0.0.1', (error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

const server = spawn('npm', ['--workspace', 'api-gateway', 'run', 'dev', '--', '-p', PORT], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
  env: {
    ...process.env,
    FREE_TIER_LAUNCH_MODE: 'false',
    FREE_TIER_API_KEYS: 'regression-key',
    TRANCO_API_BASE_URL: `${FIXTURE_BASE}/tranco/api`
  }
});

server.stdout.on('data', (chunk) => process.stdout.write(`[regression:next] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[regression:next] ${chunk}`));

try {
  process.stdout.write(`[regression] using ports next=${PORT} fixture=${FIXTURE_PORT}\n`);
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

  const topSites = await post('/api/v1/seo-tools/top-1000-websites-worldwide-country-level', {
    country: 'US',
    limit: 3
  });
  assert.equal(topSites.response.status, 200);
  assert.equal(topSites.json.success, true);
  assert.equal(topSites.json.data.status, 'global_rank_snapshot');
  assert.equal(topSites.json.data.scope, 'global');
  assert.equal(topSites.json.data.requestedCountry, 'US');
  assert.equal(topSites.json.data.countryScopeApplied, false);
  assert.equal(topSites.json.data.listId, 'TEST-LATEST');
  assert.equal(topSites.json.data.siteCount, 3);
  assert.equal(Array.isArray(topSites.json.data.sites), true);
  assert.deepEqual(topSites.json.data.sites.map((item) => item.domain), [
    'google.com',
    'youtube.com',
    'facebook.com'
  ]);
  assert.equal(topSites.json.data.evidence.metadataFetched, true);
  assert.equal(topSites.json.data.evidence.listDownloaded, true);
  assert.equal(topSites.json.data.evidence.rowsParsed, true);
  assertPublicApiWrapperContract(topSites.json.data);

  const xProfile = await post('/api/v1/seo-tools/x-twitter', {
    username: '@OpenAI'
  });
  assert.equal(xProfile.response.status, 200);
  assert.equal(xProfile.json.success, true);
  assert.equal(xProfile.json.data.status, 'profile_lite');
  assert.equal(xProfile.json.data.username, 'openai');
  assert.equal(xProfile.json.data.profileUrl, 'https://x.com/openai');
  assert.equal(xProfile.json.data.helperMode, 'profile_lite_only');
  assertLinkBuilderContract(xProfile.json.data);

  const xFallback = await post('/api/v1/seo-tools/x-twitter', {
    query: 'latest ai news'
  });
  assert.equal(xFallback.response.status, 200);
  assert.equal(xFallback.json.success, true);
  assert.equal(xFallback.json.data.status, 'profile_target_required');
  assert.equal(typeof xFallback.json.data.searchUrl, 'string');
  assert.ok(xFallback.json.data.searchUrl.includes('x.com/search'));
  assert.equal(xFallback.json.data.helperMode, 'profile_lite_only');
  assertLinkBuilderContract(xFallback.json.data);

  const showtimes = await post('/api/v1/seo-tools/showtimes', {
    movie: 'Dune',
    location: 'New York'
  });
  assert.equal(showtimes.response.status, 200);
  assert.equal(showtimes.json.success, true);
  assert.equal(showtimes.json.data.status, 'helper_only');
  assert.equal(showtimes.json.data.query, 'Dune showtimes New York');
  assert.equal(typeof showtimes.json.data.searchUrl, 'string');
  assert.ok(showtimes.json.data.searchUrl.includes('google.com/search'));
  assertShallowHelperContract(showtimes.json.data);

  const carHire = await post('/api/v1/seo-tools/car-hire-rental', {
    location: 'Paris'
  });
  assert.equal(carHire.response.status, 200);
  assert.equal(carHire.json.success, true);
  assert.equal(carHire.json.data.status, 'helper_only');
  assert.equal(carHire.json.data.provider, 'skyscanner');
  assert.equal(carHire.json.data.vertical, 'car_hire');
  assert.equal(carHire.json.data.helperFamily, 'travel-search-helpers');
  assert.equal(typeof carHire.json.data.searchUrl, 'string');
  assert.ok(carHire.json.data.searchUrl.includes('skyscanner.com/carhire/search'));
  assertShallowHelperContract(carHire.json.data);

  const carHireBulk = await post('/api/v1/seo-tools/car-hire-rental-bulk', {
    locations: ['Paris', 'Berlin']
  });
  assert.equal(carHireBulk.response.status, 200);
  assert.equal(carHireBulk.json.success, true);
  assert.equal(carHireBulk.json.data.status, 'compatibility_wrapper');
  assert.equal(carHireBulk.json.data.provider, 'skyscanner');
  assert.equal(carHireBulk.json.data.vertical, 'car_hire');
  assert.equal(carHireBulk.json.data.resultCount, 2);
  assert.equal(carHireBulk.json.data.compatibilityTarget, '/api/v1/seo-tools/car-hire-rental');
  assert.equal(Array.isArray(carHireBulk.json.data.results), true);
  assert.ok(carHireBulk.json.data.results[0].searchUrl.includes('skyscanner.com/carhire/search'));
  assertShallowHelperContract(carHireBulk.json.data);

  const spotifyPlus = await post('/api/v1/seo-tools/spotify-plus', {
    query: 'indie jazz'
  });
  assert.equal(spotifyPlus.response.status, 200);
  assert.equal(spotifyPlus.json.success, true);
  assert.equal(spotifyPlus.json.data.status, 'compatibility_wrapper');
  assert.equal(spotifyPlus.json.data.compatibilityTarget, '/api/v1/seo-tools/spotify');
  assert.equal(spotifyPlus.json.data.tier, 'plus');
  assert.equal(typeof spotifyPlus.json.data.searchUrl, 'string');
  assertLinkBuilderContract(spotifyPlus.json.data);

  const spyfu = await post('/api/v1/seo-tools/spyfu', {
    domain: 'openai.com'
  });
  assert.equal(spyfu.response.status, 200);
  assert.equal(spyfu.json.success, true);
  assert.equal(spyfu.json.data.status, 'helper_only');
  assert.equal(typeof spyfu.json.data.reportUrl, 'string');
  assert.ok(spyfu.json.data.reportUrl.includes('spyfu.com/overview/domain'));
  assertLinkBuilderContract(spyfu.json.data);

  const spyfuBulk = await post('/api/v1/seo-tools/spyfu-bulk-urls', {
    domains: ['openai.com', 'example.com']
  });
  assert.equal(spyfuBulk.response.status, 200);
  assert.equal(spyfuBulk.json.success, true);
  assert.equal(spyfuBulk.json.data.status, 'compatibility_wrapper');
  assert.equal(spyfuBulk.json.data.compatibilityTarget, '/api/v1/seo-tools/spyfu');
  assert.equal(spyfuBulk.json.data.resultCount, 2);
  assert.equal(Array.isArray(spyfuBulk.json.data.results), true);
  assert.ok(spyfuBulk.json.data.results[0].reportUrl.includes('spyfu.com/overview/domain'));
  assertLinkBuilderContract(spyfuBulk.json.data);

  const trayvmy = await post('/api/v1/seo-tools/trayvmy-actor', {});
  assert.equal(trayvmy.response.status, 400);
  assert.equal(trayvmy.json.success, false);
  assert.equal(trayvmy.json.error?.code, 'validation_error');

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
  assertProviderTemplateContract(openPageRank.json.data, 'OpenPageRank');
  assert.equal(Array.isArray(openPageRank.json.data.results), true);
  assert.equal(openPageRank.json.data.results.length, 2);
  assert.equal(openPageRank.json.data.results[0].status, 'provider_credentials_required');

  const rentcast = await post('/api/v1/seo-tools/rentcast', {
    address: '1600 Pennsylvania Ave NW, Washington, DC'
  });
  assert.equal(rentcast.response.status, 200);
  assert.equal(rentcast.json.success, true);
  assertProviderTemplateContract(rentcast.json.data, 'RentCast');
  assert.equal(typeof rentcast.json.data.lookupUrl, 'string');
  assert.ok(rentcast.json.data.lookupUrl.includes('rentcast.io'));

  const youtubeRegion = await post('/api/v1/seo-tools/youtube-region-restriction-checker', {
    videoId: 'dQw4w9WgXcQ'
  });
  assert.equal(youtubeRegion.response.status, 200);
  assert.equal(youtubeRegion.json.success, true);
  assert.ok(['analyzed', 'unresolved'].includes(youtubeRegion.json.data.status));
  if (youtubeRegion.json.data.status === 'analyzed') {
    assert.equal(youtubeRegion.json.data.source, 'youtube_watch_player_response');
    assert.equal(youtubeRegion.json.data.playabilityStatus, 'OK');
    assert.equal(Array.isArray(youtubeRegion.json.data.availableCountries), true);
    assert.ok(youtubeRegion.json.data.availableCountries.length > 50);
    assert.ok(youtubeRegion.json.data.availableCountries.includes('US'));
    assert.equal(youtubeRegion.json.data.evidence.watchPageFetched, true);
    assert.equal(youtubeRegion.json.data.evidence.playerResponseParsed, true);
    assertHtmlScraperContract(youtubeRegion.json.data);
  } else {
    assert.equal(youtubeRegion.json.data.source, 'youtube_watch_html');
    assert.equal(typeof youtubeRegion.json.data.videoUrl, 'string');
    assert.equal(youtubeRegion.json.data.contract.forensicCategory, 'html-scraper');
    assert.equal(youtubeRegion.json.data.contract.implementationDepth, 'partial');
    assert.equal(youtubeRegion.json.data.contract.launchRecommendation, 'public_lite');
  }

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
  assert.equal(typeof bbb.json.data.evidence.webDigitalDataParsed, 'boolean');
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

  const domainDetails = await post('/api/v1/seo-tools/domain-availability-expiry-whois-dns-ip-asn-70-tld', {
    domain: 'openai.com'
  });
  assert.equal(domainDetails.response.status, 200);
  assert.equal(domainDetails.json.success, true);
  assert.equal(domainDetails.json.data.domain, 'openai.com');
  assert.equal(typeof domainDetails.json.data.available, 'boolean');
  assert.equal(typeof domainDetails.json.data.dns.status, 'number');
  assert.equal(typeof domainDetails.json.data.dns.answerCount, 'number');
  assert.equal(Array.isArray(domainDetails.json.data.dns.aRecords), true);
  assert.ok(domainDetails.json.data.dns.aRecords.length >= 1);
  assert.equal(Array.isArray(domainDetails.json.data.dns.answers), true);
  assert.equal(Array.isArray(domainDetails.json.data.dns.matrix), true);
  assert.ok(domainDetails.json.data.dns.matrix.length >= 6);
  assert.equal(typeof domainDetails.json.data.http.finalUrl, 'string');
  assert.equal(typeof domainDetails.json.data.http.reachable, 'boolean');
  assert.equal(domainDetails.json.data.evidence.liveDns, true);
  assert.equal(domainDetails.json.data.evidence.liveHttp, true);
  assert.equal(domainDetails.json.data.evidence.liveWhois, false);
  assert.equal(domainDetails.json.data.evidence.liveAsn, false);
  assertNetworkWrapperContract(domainDetails.json.data);

  const ga4Mcp = await post('/api/v1/seo-tools/ga4-mcp', {
    url: FIXTURE_URL,
    propertyId: 'G-TEST1234'
  });
  assert.equal(ga4Mcp.response.status, 200);
  assert.equal(ga4Mcp.json.success, true);
  assert.equal(ga4Mcp.json.data.status, 'analyzed');
  assert.equal(ga4Mcp.json.data.mode, 'tag_detection');
  assert.equal(ga4Mcp.json.data.requestedCount, 1);
  assert.equal(ga4Mcp.json.data.analyzedCount, 1);
  assert.equal(ga4Mcp.json.data.errorCount, 0);
  assert.equal(ga4Mcp.json.data.requestedPropertyId, 'G-TEST1234');
  assert.equal(Array.isArray(ga4Mcp.json.data.results), true);
  assert.equal(ga4Mcp.json.data.results.length, 1);
  assert.equal(ga4Mcp.json.data.results[0].status, 'analyzed');
  assert.equal(ga4Mcp.json.data.results[0].title, 'GA4 Fixture');
  assert.equal(ga4Mcp.json.data.results[0].ga4Detected, true);
  assert.ok(ga4Mcp.json.data.results[0].measurementIds.includes('G-TEST1234'));
  assert.ok(ga4Mcp.json.data.results[0].gtmContainerIds.includes('GTM-TEST456'));
  assert.equal(ga4Mcp.json.data.results[0].signals.gtagLoaderDetected, true);
  assert.equal(ga4Mcp.json.data.results[0].signals.gtmLoaderDetected, true);
  assert.equal(ga4Mcp.json.data.results[0].signals.dataLayerDetected, true);
  assert.equal(ga4Mcp.json.data.results[0].signals.ga4ConfigDetected, true);
  assert.equal(ga4Mcp.json.data.results[0].requestedProperty?.type, 'measurement_id');
  assert.equal(ga4Mcp.json.data.results[0].requestedProperty?.matchesDetectedMeasurementId, true);
  assert.equal(ga4Mcp.json.data.results[0].evidence.htmlFetched, true);
  assertHtmlScraperContract(ga4Mcp.json.data);

  const mozSpam = await post('/api/v1/seo-tools/moz-da-pa-spam-checker', {
    domain: 'openai.com'
  });
  assert.equal(mozSpam.response.status, 200);
  assert.equal(mozSpam.json.success, true);
  assert.equal(mozSpam.json.data.status, 'analyzed');
  assert.equal(mozSpam.json.data.mode, 'proxy_scores');
  assert.equal(mozSpam.json.data.domain, 'openai.com');
  assert.equal(typeof mozSpam.json.data.da, 'number');
  assert.equal(typeof mozSpam.json.data.pa, 'number');
  assert.equal(typeof mozSpam.json.data.spamScore, 'number');
  assert.equal(typeof mozSpam.json.data.signals?.tld, 'string');
  assert.equal(typeof mozSpam.json.data.signals?.httpsReachable, 'boolean');
  assert.equal(typeof mozSpam.json.data.signals?.auditScore, 'number');
  assert.equal(Array.isArray(mozSpam.json.data.pages), true);
  assert.equal(mozSpam.json.data.pages.length, 1);
  assert.equal(typeof mozSpam.json.data.summary?.siteScore, 'number');
  assertHtmlScraperContract(mozSpam.json.data);

  const seobilityRanking = await post('/api/v1/seo-tools/seobility-ranking-seo', {
    domain: 'openai.com'
  });
  assert.equal(seobilityRanking.response.status, 200);
  assert.equal(seobilityRanking.json.success, true);
  assert.equal(seobilityRanking.json.data.status, 'analyzed');
  assert.equal(seobilityRanking.json.data.mode, 'light_domain_audit');
  assert.equal(seobilityRanking.json.data.domain, 'openai.com');
  assert.equal(typeof seobilityRanking.json.data.homepageUrl, 'string');
  assert.ok(seobilityRanking.json.data.homepageUrl.includes('openai.com'));
  assert.equal(typeof seobilityRanking.json.data.availability?.available, 'boolean');
  assert.equal(Array.isArray(seobilityRanking.json.data.dnsAnswers), true);
  assert.ok(seobilityRanking.json.data.dnsAnswers.length >= 1);
  assert.equal(typeof seobilityRanking.json.data.http?.finalUrl, 'string');
  assert.ok(seobilityRanking.json.data.http.finalUrl.includes('openai.com'));
  assert.equal(Array.isArray(seobilityRanking.json.data.pages), true);
  assert.equal(seobilityRanking.json.data.pages.length, 1);
  assert.equal(typeof seobilityRanking.json.data.pages[0].score, 'number');
  assert.equal(Array.isArray(seobilityRanking.json.data.pages[0].issues), true);
  assert.equal(typeof seobilityRanking.json.data.summary?.siteScore, 'number');
  assertHtmlScraperContract(seobilityRanking.json.data);

  const trendingNews = await post('/api/v1/seo-tools/trending-news', {
    keyword: 'openai',
    limit: 3
  });
  assert.equal(trendingNews.response.status, 200);
  assert.equal(trendingNews.json.success, true);
  assert.equal(trendingNews.json.data.status, 'live_feed');
  assert.equal(trendingNews.json.data.source, 'google_news_rss');
  assert.equal(trendingNews.json.data.keyword, 'openai');
  assert.equal(typeof trendingNews.json.data.feedUrl, 'string');
  assert.ok(trendingNews.json.data.feedUrl.includes('news.google.com/rss/search'));
  assert.equal(typeof trendingNews.json.data.searchUrl, 'string');
  assert.ok(trendingNews.json.data.searchUrl.includes('news.google.com/search'));
  assert.equal(typeof trendingNews.json.data.articleCount, 'number');
  assert.ok(trendingNews.json.data.articleCount >= 1);
  assert.equal(Array.isArray(trendingNews.json.data.articles), true);
  assert.ok(trendingNews.json.data.articles.length >= 1);
  assert.equal(typeof trendingNews.json.data.articles[0].title, 'string');
  assert.equal(typeof trendingNews.json.data.articles[0].googleNewsUrl, 'string');
  assert.equal(trendingNews.json.data.evidence.feedFetched, true);
  assert.equal(trendingNews.json.data.evidence.itemsParsed, true);
  assertPublicApiWrapperContract(trendingNews.json.data);

  const similarApps = await post('/api/v1/seo-tools/similar-app-store-applications-finder', {
    appId: '6448311069'
  });
  assert.equal(similarApps.response.status, 200);
  assert.equal(similarApps.json.success, true);
  assert.equal(similarApps.json.data.status, 'analyzed');
  assert.equal(similarApps.json.data.source, 'app_store_similar_items_html');
  assert.equal(similarApps.json.data.appId, '6448311069');
  assert.equal(typeof similarApps.json.data.appUrl, 'string');
  assert.ok(similarApps.json.data.appUrl.includes('/id6448311069'));
  assert.equal(typeof similarApps.json.data.app.name, 'string');
  assert.ok(similarApps.json.data.app.name.length >= 1);
  assert.equal(typeof similarApps.json.data.shelfTitle, 'string');
  assert.ok(/might also like/i.test(similarApps.json.data.shelfTitle));
  assert.equal(typeof similarApps.json.data.similarAppCount, 'number');
  assert.ok(similarApps.json.data.similarAppCount >= 1);
  assert.equal(Array.isArray(similarApps.json.data.similarApps), true);
  assert.ok(similarApps.json.data.similarApps.length >= 1);
  assert.equal(typeof similarApps.json.data.similarApps[0].title, 'string');
  assert.equal(typeof similarApps.json.data.similarApps[0].appUrl, 'string');
  assert.equal(similarApps.json.data.evidence.pageFetched, true);
  assert.equal(similarApps.json.data.evidence.similarShelfParsed, true);
  assertHtmlScraperContract(similarApps.json.data);

  const openTable = await post('/api/v1/seo-tools/opentable', {
    location: 'san francisco',
    limit: 3
  });
  assert.equal(openTable.response.status, 200);
  assert.equal(openTable.json.success, true);
  assert.ok(['analyzed', 'helper_only'].includes(openTable.json.data.status));
  assert.equal(typeof openTable.json.data.searchUrl, 'string');
  assert.ok(openTable.json.data.searchUrl.includes('opentable.com/s/'));
  if (openTable.json.data.status === 'analyzed') {
    assert.equal(openTable.json.data.source, 'opentable_search_state');
    assert.equal(typeof openTable.json.data.restaurantCount, 'number');
    assert.ok(openTable.json.data.restaurantCount >= 1);
    assert.equal(Array.isArray(openTable.json.data.restaurants), true);
    assert.ok(openTable.json.data.restaurants.length >= 1);
    assert.equal(typeof openTable.json.data.restaurants[0].name, 'string');
    assert.equal(typeof openTable.json.data.restaurants[0].profileUrl, 'string');
    assert.ok(openTable.json.data.restaurants[0].profileUrl.includes('opentable.com/r/'));
    assert.equal(openTable.json.data.evidence.pageFetched, true);
    assert.equal(openTable.json.data.evidence.embeddedStateParsed, true);
    assert.equal(openTable.json.data.evidence.restaurantArrayParsed, true);
    assertHtmlScraperContract(openTable.json.data);
  } else {
    assert.equal(openTable.json.data.source, 'opentable_search_helper');
    assert.equal(openTable.json.data.helperMode, 'search_page_only');
    assertLinkBuilderContract(openTable.json.data);
  }

  const zapier = await post('/api/v1/seo-tools/zapier', {
    query: 'slack',
    limit: 4
  });
  assert.equal(zapier.response.status, 200);
  assert.equal(zapier.json.success, true);
  assert.equal(zapier.json.data.status, 'analyzed');
  assert.equal(zapier.json.data.source, 'zapier_app_integrations_html');
  assert.equal(zapier.json.data.requestedSlug, 'slack');
  assert.equal(zapier.json.data.resolvedSlug, 'slack');
  assert.equal(typeof zapier.json.data.canonicalUrl, 'string');
  assert.ok(zapier.json.data.canonicalUrl.includes('/apps/slack/integrations'));
  assert.equal(zapier.json.data.app.name, 'Slack');
  assert.equal(typeof zapier.json.data.app.description, 'string');
  assert.ok(zapier.json.data.app.description.length >= 20);
  assert.equal(typeof zapier.json.data.app.installUrl, 'string');
  assert.ok(zapier.json.data.app.installUrl.includes('zapier.com/webintent'));
  assert.equal(typeof zapier.json.data.app.integrationCount, 'number');
  assert.ok(zapier.json.data.app.integrationCount >= 1000);
  assert.equal(Array.isArray(zapier.json.data.app.featureList), true);
  assert.ok(zapier.json.data.app.featureList.length >= 1);
  assert.equal(typeof zapier.json.data.integrationCardCount, 'number');
  assert.ok(zapier.json.data.integrationCardCount >= 1);
  assert.equal(Array.isArray(zapier.json.data.integrations), true);
  assert.ok(zapier.json.data.integrations.length >= 1);
  assert.equal(typeof zapier.json.data.integrations[0].appName, 'string');
  assert.equal(typeof zapier.json.data.integrations[0].detailsUrl, 'string');
  assert.ok(zapier.json.data.integrations[0].detailsUrl.includes('zapier.com/apps/'));
  assert.equal(zapier.json.data.evidence.pageFetched, true);
  assert.equal(zapier.json.data.evidence.metadataParsed, true);
  assert.equal(zapier.json.data.evidence.jsonLdParsed, true);
  assert.equal(zapier.json.data.evidence.integrationCardsParsed, true);
  assertHtmlScraperContract(zapier.json.data);

  const woorank = await post('/api/v1/seo-tools/woorank', {
    url: 'https://openai.com',
    keyword: 'openai'
  });
  assert.equal(woorank.response.status, 200);
  assert.equal(woorank.json.success, true);
  assert.equal(woorank.json.data.status, 'analyzed');
  assert.equal(woorank.json.data.mode, 'light_audit');
  assert.equal(Array.isArray(woorank.json.data.pages), true);
  assert.ok(woorank.json.data.pages.length >= 1);
  assert.equal(typeof woorank.json.data.pages[0].url, 'string');
  assert.equal(typeof woorank.json.data.pages[0].score, 'number');
  assert.equal(Array.isArray(woorank.json.data.pages[0].issues), true);
  assert.equal(typeof woorank.json.data.summary?.siteScore, 'number');
  assert.equal(typeof woorank.json.data.summary?.pageCount, 'number');
  assertHtmlScraperContract(woorank.json.data);

  const barcode = await post('/api/v1/seo-tools/barcode', {
    code: '737628064502'
  });
  assert.equal(barcode.response.status, 200);
  assert.equal(barcode.json.success, true);
  assert.equal(barcode.json.data.status, 'found');
  assert.ok(['openfoodfacts_public_api', 'openfoodfacts_product_page_html'].includes(barcode.json.data.source));
  assert.equal(barcode.json.data.code, '737628064502');
  assert.equal(barcode.json.data.format, 'UPC-A');
  assert.equal(typeof barcode.json.data.lookupUrl, 'string');
  assert.ok(barcode.json.data.lookupUrl.includes('openfoodfacts.org'));
  assert.equal(typeof barcode.json.data.product?.name, 'string');
  assert.ok(barcode.json.data.product.name.length >= 5);
  assert.equal(typeof barcode.json.data.product?.brands, 'string');
  assert.ok(barcode.json.data.product.brands.length >= 3);
  assert.equal(typeof barcode.json.data.product?.productUrl, 'string');
  assert.ok(barcode.json.data.product.productUrl.includes('openfoodfacts.org/product/'));
  assert.equal(barcode.json.data.evidence.publicApiChecked, true);
  assert.equal(barcode.json.data.evidence.productFound, true);
  assert.equal(typeof barcode.json.data.evidence.productPageFallbackUsed, 'boolean');
  assertPublicApiWrapperContract(barcode.json.data);

  const profanity = await post('/api/v1/seo-tools/profanity-checker', {
    text: 'This sh1t feels damn rude and cruddy.',
    customWords: ['cruddy']
  }, {
    'x-api-key': 'regression-key'
  });
  assert.equal(profanity.response.status, 200);
  assert.equal(profanity.json.success, true);
  assert.equal(profanity.json.data.status, 'analyzed');
  assert.equal(typeof profanity.json.data.matchCount, 'number');
  assert.ok(profanity.json.data.matchCount >= 3);
  assert.equal(Array.isArray(profanity.json.data.matches), true);
  assert.ok(profanity.json.data.matches.some((match) => match.term === 'shit'));
  assert.ok(profanity.json.data.matches.some((match) => match.term === 'damn'));
  assert.ok(profanity.json.data.matches.some((match) => match.term === 'cruddy'));
  assert.equal(typeof profanity.json.data.cleaned, 'string');
  assert.ok(profanity.json.data.cleaned.includes('****'));
  assert.equal(typeof profanity.json.data.categoryCounts.profanity, 'number');
  assert.ok(profanity.json.data.categoryCounts.profanity >= 2);
  assert.equal(profanity.json.data.highestSeverity, 'high');
  assert.equal(profanity.json.data.evidence.localLexiconUsed, true);
  assert.equal(profanity.json.data.evidence.customTermsUsed, 1);
  assert.equal(profanity.json.data.evidence.obfuscationNormalized, true);
  assert.equal(profanity.json.data.contract.forensicCategory, 'local-utility');
  assert.equal(profanity.json.data.contract.implementationDepth, 'live');
  assert.equal(profanity.json.data.contract.launchRecommendation, 'public_lite');

  const markdownTable = await post('/api/v1/seo-tools/markdown-table-generator', {
    input: 'Name,Role,Score\nAda,Engineer,10\nGrace,Scientist,9',
    alignments: ['left', 'left', 'right']
  }, {
    'x-api-key': 'regression-key'
  });
  assert.equal(markdownTable.response.status, 200);
  assert.equal(markdownTable.json.success, true);
  assert.equal(markdownTable.json.data.status, 'generated');
  assert.equal(markdownTable.json.data.rowCount, 2);
  assert.equal(markdownTable.json.data.columnCount, 3);
  assert.equal(markdownTable.json.data.delimiterUsed, ',');
  assert.equal(Array.isArray(markdownTable.json.data.headers), true);
  assert.equal(markdownTable.json.data.headers[0], 'Name');
  assert.equal(markdownTable.json.data.alignments[2], 'right');
  assert.equal(typeof markdownTable.json.data.markdown, 'string');
  assert.ok(markdownTable.json.data.markdown.includes('| Name | Role | Score |'));
  assert.ok(markdownTable.json.data.markdown.includes('| --- | --- | ---: |'));
  assert.equal(markdownTable.json.data.evidence.parsedDelimitedInput, true);
  assert.equal(markdownTable.json.data.contract.forensicCategory, 'local-utility');
  assert.equal(markdownTable.json.data.contract.implementationDepth, 'live');
  assert.equal(markdownTable.json.data.contract.launchRecommendation, 'public_lite');

  const hashtags = await post('/api/v1/seo-tools/social-media-hashtag-generator', {
    keywords: ['AI marketing', 'content strategy'],
    platform: 'linkedin',
    maxTags: 10
  }, {
    'x-api-key': 'regression-key'
  });
  assert.equal(hashtags.response.status, 200);
  assert.equal(hashtags.json.success, true);
  assert.equal(hashtags.json.data.status, 'generated');
  assert.equal(hashtags.json.data.platform, 'linkedin');
  assert.equal(hashtags.json.data.keywordCount, 2);
  assert.equal(typeof hashtags.json.data.hashtagCount, 'number');
  assert.ok(hashtags.json.data.hashtagCount >= 4);
  assert.ok(hashtags.json.data.hashtagCount <= 10);
  assert.equal(Array.isArray(hashtags.json.data.hashtags), true);
  assert.ok(hashtags.json.data.hashtags.some((item) => item.hashtag === '#aimarketing'));
  assert.ok(hashtags.json.data.hashtags.some((item) => item.hashtag === '#contentstrategy'));
  assert.equal(Array.isArray(hashtags.json.data.grouped), true);
  assert.equal(hashtags.json.data.grouped.length, 2);
  assert.equal(hashtags.json.data.evidence.platformPresetUsed, 'linkedin');
  assert.ok(hashtags.json.data.evidence.exactCount >= 2);
  assert.ok(hashtags.json.data.evidence.tokenCount >= 2);
  assert.equal(hashtags.json.data.contract.forensicCategory, 'local-utility');
  assert.equal(hashtags.json.data.contract.implementationDepth, 'live');
  assert.equal(hashtags.json.data.contract.launchRecommendation, 'public_lite');

  const openGraph = await post('/api/v1/seo-tools/open-graph-image-generator', {
    title: 'AI Search Visibility Playbook',
    subtitle: 'Technical SEO + GEO + AEO',
    brand: 'DataLensAPI',
    theme: 'ocean'
  });
  assert.equal(openGraph.response.status, 200);
  assert.equal(openGraph.json.success, true);
  assert.equal(openGraph.json.data.status, 'generated');
  assert.equal(openGraph.json.data.theme, 'ocean');
  assert.equal(openGraph.json.data.width, 1200);
  assert.equal(openGraph.json.data.height, 630);
  assert.equal(openGraph.json.data.mimeType, 'image/svg+xml');
  assert.equal(typeof openGraph.json.data.svg, 'string');
  assert.ok(openGraph.json.data.svg.startsWith('<svg'));
  assert.ok(openGraph.json.data.svg.includes('AI Search Visibility Playbook'));
  assert.equal(typeof openGraph.json.data.dataUri, 'string');
  assert.ok(openGraph.json.data.dataUri.startsWith('data:image/svg+xml'));
  assert.equal(openGraph.json.data.evidence.localSvgGenerated, true);
  assert.equal(openGraph.json.data.evidence.themePresetUsed, 'ocean');
  assert.equal(openGraph.json.data.contract.forensicCategory, 'local-utility');
  assert.equal(openGraph.json.data.contract.implementationDepth, 'live');
  assert.equal(openGraph.json.data.contract.launchRecommendation, 'public_lite');

  const plagiarism = await post('/api/v1/seo-tools/plagiarism-checker', {
    texts: [
      'OpenAI builds AI systems for research and products. Teams use AI systems for productivity and search.',
      'Many teams use AI systems for productivity and search. OpenAI builds AI systems for research and products.'
    ],
    phraseSize: 4,
    maxMatches: 4
  });
  assert.equal(plagiarism.response.status, 200);
  assert.equal(plagiarism.json.success, true);
  assert.equal(plagiarism.json.data.status, 'analyzed');
  assert.equal(plagiarism.json.data.method, 'local_ngram_similarity');
  assert.equal(plagiarism.json.data.textCount, 2);
  assert.equal(plagiarism.json.data.phraseSize, 4);
  assert.equal(plagiarism.json.data.maxMatches, 4);
  assert.equal(typeof plagiarism.json.data.maxPairwiseSimilarity, 'number');
  assert.ok(plagiarism.json.data.maxPairwiseSimilarity >= 50);
  assert.equal(plagiarism.json.data.riskLevel, 'medium');
  assert.equal(Array.isArray(plagiarism.json.data.results), true);
  assert.equal(plagiarism.json.data.results.length, 2);
  assert.equal(Array.isArray(plagiarism.json.data.pairwiseMatches), true);
  assert.equal(plagiarism.json.data.pairwiseMatches.length, 1);
  assert.ok(plagiarism.json.data.pairwiseMatches[0].sharedPhraseCount >= 2);
  assert.ok(plagiarism.json.data.pairwiseMatches[0].sharedPhrases.includes('ai systems for productivity'));
  assert.equal(plagiarism.json.data.evidence.localTokenizationUsed, true);
  assert.equal(plagiarism.json.data.evidence.crossTextOverlapDetected, true);
  assert.equal(plagiarism.json.data.contract.forensicCategory, 'local-utility');
  assert.equal(plagiarism.json.data.contract.implementationDepth, 'live');
  assert.equal(plagiarism.json.data.contract.launchRecommendation, 'public_lite');

  const serpMeta = await post('/api/v1/seo-tools/serp-meta-title-generator', {
    keyword: 'AI search visibility',
    brand: 'DataLensAPI',
    intent: 'guide',
    audience: 'marketing teams',
    maxTitles: 6,
    includeYear: true
  });
  assert.equal(serpMeta.response.status, 200);
  assert.equal(serpMeta.json.success, true);
  assert.equal(serpMeta.json.data.status, 'generated');
  assert.equal(serpMeta.json.data.keyword, 'AI search visibility');
  assert.equal(serpMeta.json.data.brand, 'DataLensAPI');
  assert.equal(serpMeta.json.data.intent, 'guide');
  assert.equal(typeof serpMeta.json.data.recommendedTitle, 'string');
  assert.ok(serpMeta.json.data.recommendedTitle.includes('AI search visibility'));
  assert.equal(Array.isArray(serpMeta.json.data.titles), true);
  assert.ok(serpMeta.json.data.titles.length >= 3);
  assert.ok(serpMeta.json.data.titles.length <= 6);
  assert.equal(typeof serpMeta.json.data.titles[0].score, 'number');
  assert.equal(typeof serpMeta.json.data.titles[0].pixelWidthEstimate, 'number');
  assert.equal(Array.isArray(serpMeta.json.data.titles[0].notes), true);
  assert.ok(serpMeta.json.data.evidence.keywordAtFrontCount >= 1);
  assert.ok(serpMeta.json.data.evidence.withinRecommendedLengthCount >= 1);
  assert.equal(serpMeta.json.data.contract.forensicCategory, 'local-utility');
  assert.equal(serpMeta.json.data.contract.implementationDepth, 'live');
  assert.equal(serpMeta.json.data.contract.launchRecommendation, 'public_lite');

  const topicTrends = await post('/api/v1/seo-tools/topic-trend-aggregator', {
    topics: [
      'AI search visibility',
      'AI search visibility guide',
      'AI search visibility tips',
      'AI search visibility for marketing teams',
      'Prompt engineering workflow',
      'Prompt engineering checklist'
    ],
    topN: 3
  });
  assert.equal(topicTrends.response.status, 200);
  assert.equal(topicTrends.json.success, true);
  assert.equal(topicTrends.json.data.status, 'aggregated');
  assert.equal(topicTrends.json.data.trendCount, 2);
  assert.equal(Array.isArray(topicTrends.json.data.trends), true);
  assert.ok(topicTrends.json.data.trends.length >= 2);
  assert.equal(topicTrends.json.data.trends[0].topic, 'AI Search Visibility');
  assert.ok(topicTrends.json.data.trends[0].mentions >= 4);
  assert.ok(topicTrends.json.data.trends[0].trendScore >= 80);
  assert.ok(topicTrends.json.data.trends[0].sharedTokens.includes('ai'));
  assert.ok(topicTrends.json.data.trends[0].sharedTokens.includes('search'));
  assert.ok(topicTrends.json.data.trends[0].sharedTokens.includes('visibility'));
  assert.equal(topicTrends.json.data.evidence.inputTopicCount, 6);
  assert.ok(topicTrends.json.data.evidence.mergedTopicCount >= 2);
  assert.equal(Array.isArray(topicTrends.json.data.evidence.topKeywords), true);
  assert.ok(topicTrends.json.data.evidence.topKeywords.some((entry) => entry.token === 'visibility'));
  assert.equal(topicTrends.json.data.contract.forensicCategory, 'local-utility');
  assert.equal(topicTrends.json.data.contract.implementationDepth, 'live');
  assert.equal(topicTrends.json.data.contract.launchRecommendation, 'public_lite');

  console.log('regression-tests: canonical families ok');
} finally {
  await stopProcess(server, 'api-gateway');
  await closeServer(fixtureServer, 'fixture server');
}
