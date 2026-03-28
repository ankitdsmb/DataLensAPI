import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const PORT = process.env.SMOKE_PORT ?? '3101';
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) {
        return;
      }
    } catch {
      // keep polling
    }
    await wait(500);
  }

  throw new Error(`server did not become ready at ${url}`);
}

async function postJson(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': 'smoke-key' },
    body: JSON.stringify(body)
  });

  const json = await response.json();
  return { response, json };
}

function assertEnvelope(json) {
  assert.equal(typeof json.success, 'boolean');
  assert.equal(typeof json.metadata?.request_id, 'string');
  assert.equal(typeof json.metadata?.execution_time_ms, 'number');
  assert.equal(json.metadata?.source, 'datalens');
  assert.ok(Object.prototype.hasOwnProperty.call(json, 'data'));
  assert.ok(Object.prototype.hasOwnProperty.call(json, 'error'));
}

const server = spawn('npm', ['--workspace', 'api-gateway', 'run', 'dev', '--', '-p', PORT], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    FREE_TIER_LAUNCH_MODE: 'false',
    FREE_TIER_API_KEYS: 'smoke-key'
  }
});

server.stdout.on('data', (chunk) => process.stdout.write(`[smoke:next] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[smoke:next] ${chunk}`));

try {
  await waitForServer(`${BASE_URL}/api/v1/seo-tools/spotify`, 60000);

  const auditValidation = await postJson('/api/v1/seo-tools/seo-audit-tool', {
    unexpected: true
  });
  assert.equal(auditValidation.response.status, 400);
  assertEnvelope(auditValidation.json);
  assert.equal(auditValidation.json.error?.code, 'validation_error');

  const keywordValidation = await postJson('/api/v1/seo-tools/search-keyword-research', {
    keyword: 'seo',
    invalid: true
  });
  assert.equal(keywordValidation.response.status, 400);
  assertEnvelope(keywordValidation.json);
  assert.equal(keywordValidation.json.error?.code, 'validation_error');

  const domainValidation = await postJson('/api/v1/seo-tools/domain-checker', {
    domain: '',
    unknown: true
  });
  assert.equal(domainValidation.response.status, 400);
  assertEnvelope(domainValidation.json);
  assert.equal(domainValidation.json.error?.code, 'validation_error');

  const queued = await postJson('/api/v1/seo-tools/youtube-rank-checker', {
    keyword: 'test keyword',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  });
  assert.equal(queued.response.status, 200);
  assertEnvelope(queued.json);
  const jobId = queued.json.data?.job?.id;
  assert.equal(typeof jobId, 'string');

  const jobStatusResponse = await fetch(`${BASE_URL}/api/v1/jobs/${jobId}`);
  const jobStatus = await jobStatusResponse.json();
  assert.equal(jobStatusResponse.status, 200);
  assertEnvelope(jobStatus);

  console.log('smoke-tests: live routes ok');
} finally {
  server.kill('SIGTERM');
  await wait(500);
}
