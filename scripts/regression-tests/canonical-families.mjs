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
    ['/api/v1/seo-tools/business-websites-ranker', { keyword: 'coffee', location: 'austin' }, 'searchUrl'],
    ['/api/v1/seo-tools/similarweb', { domain: 'example.com' }, 'reportUrl'],
    ['/api/v1/seo-tools/spotify', { query: 'indie jazz' }, 'searchUrl'],
    ['/api/v1/seo-tools/trustpilot-plus', { company: 'acme' }, 'searchUrl']
  ];

  for (const [path, payload, field] of cases) {
    const result = await post(path, payload);
    assert.equal(result.response.status, 200, `${path} status`);
    assert.equal(result.json.success, true, `${path} success`);
    assert.ok(result.json.data[field], `${path} expected field ${field}`);
    assertLinkBuilderContract(result.json.data);
  }

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

  console.log('regression-tests: canonical families ok');
} finally {
  await stopProcess(server, 'api-gateway');
}
