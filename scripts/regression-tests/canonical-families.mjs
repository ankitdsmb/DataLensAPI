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

const server = spawn('npm', ['--workspace', 'api-gateway', 'run', 'dev', '--', '-p', PORT], {
  stdio: ['ignore', 'pipe', 'pipe'],
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
    ['/api/v1/seo-tools/trustpilot-plus', { company: 'acme' }, 'searchUrl'],
    ['/api/v1/seo-tools/youtube-region-restriction-checker', { videoId: 'dQw4w9WgXcQ' }, 'videoUrl']
  ];

  for (const [path, payload, field] of cases) {
    const result = await post(path, payload);
    assert.equal(result.response.status, 200, `${path} status`);
    assert.equal(result.json.success, true, `${path} success`);
    assert.ok(result.json.data[field], `${path} expected field ${field}`);
    assertLinkBuilderContract(result.json.data);
  }

  console.log('regression-tests: canonical families ok');
} finally {
  server.kill('SIGTERM');
  await wait(500);
}
