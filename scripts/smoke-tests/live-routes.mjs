import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = process.env.SMOKE_PORT ?? '3101';
const SCRAPER_PORT = process.env.SMOKE_SCRAPER_PORT ?? '3103';
const EVIDENCE_PORT = process.env.SMOKE_EVIDENCE_PORT ?? '3104';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCRAPER_URL = `http://127.0.0.1:${SCRAPER_PORT}`;
const EVIDENCE_URL = `http://127.0.0.1:${EVIDENCE_PORT}`;

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

async function postExternalJson(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  const json = await response.json();
  return { response, json };
}

async function getJson(path, options = {}) {
  const headers = options.withApiKey ? { 'x-api-key': 'smoke-key' } : {};
  const response = await fetch(`${BASE_URL}${path}`, {
    headers
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

async function waitForJob(jobId, timeoutMs = 60000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await getJson(`/api/v1/jobs/${jobId}`, { withApiKey: true });
    assert.equal(result.response.status, 200);
    assertEnvelope(result.json);

    const job = result.json.data;
    if (job?.status === 'succeeded' || job?.status === 'failed' || job?.status === 'expired') {
      return job;
    }

    await wait(500);
  }

  throw new Error(`job ${jobId} did not reach a terminal state in time`);
}

function createEvidenceServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/page') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html>
<html lang="en">
  <head>
    <title>Smoke Evidence Page</title>
    <meta name="description" content="Local smoke-test evidence page for snapify." />
  </head>
  <body>
    <main>
      <h1>Smoke Evidence</h1>
      <p>This page exists so async smoke tests can capture deterministic HTML evidence.</p>
    </main>
  </body>
</html>`);
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  });

  return new Promise((resolve) => {
    server.listen(Number(EVIDENCE_PORT), '127.0.0.1', () => resolve(server));
  });
}

function stopProcess(child, label) {
  if (child.exitCode !== null || child.killed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const fallback = setTimeout(() => {
      process.stderr.write(`[smoke:cleanup] forcing ${label} shutdown\n`);
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

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

const scraper = spawn('npm', ['--workspace', 'scraper-service', 'run', 'start'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
  env: {
    ...process.env,
    PORT: SCRAPER_PORT,
    PLAYWRIGHT_BROWSERS_PATH:
      process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/tmp/pw-cache/ms-playwright'
  }
});

scraper.stdout.on('data', (chunk) => process.stdout.write(`[smoke:scraper] ${chunk}`));
scraper.stderr.on('data', (chunk) => process.stderr.write(`[smoke:scraper] ${chunk}`));

const server = spawn('npm', ['--workspace', 'api-gateway', 'run', 'dev', '--', '-p', PORT], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
  env: {
    ...process.env,
    FREE_TIER_LAUNCH_MODE: 'false',
    FREE_TIER_API_KEYS: 'smoke-key',
    SCRAPER_SERVICE_URL: SCRAPER_URL
  }
});

server.stdout.on('data', (chunk) => process.stdout.write(`[smoke:next] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[smoke:next] ${chunk}`));

const evidenceServer = await createEvidenceServer();

try {
  await waitForServer(SCRAPER_URL, 60000);
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
  assert.equal(queued.json.data?.job?.retention?.artifactAccess, 'authenticated');
  assert.equal(queued.json.data?.job?.retention?.jobTtlSeconds, 12 * 60 * 60);
  assert.equal(queued.json.data?.job?.retention?.artifactTtlSeconds, 6 * 60 * 60);

  const youtubeUnauthorizedStatus = await getJson(`/api/v1/jobs/${jobId}`);
  assert.equal(youtubeUnauthorizedStatus.response.status, 401);
  assertEnvelope(youtubeUnauthorizedStatus.json);
  assert.equal(youtubeUnauthorizedStatus.json.error?.code, 'unauthorized');

  const youtubeJob = await waitForJob(jobId);
  assert.equal(youtubeJob.status, 'succeeded');
  assert.ok(['provider', 'simulated'].includes(youtubeJob.execution?.mode));
  assert.equal(youtubeJob.execution?.readyForPublicLaunch, false);
  assert.equal(youtubeJob.retention?.artifactAccess, 'authenticated');
  assert.equal(youtubeJob.retention?.jobTtlSeconds, 12 * 60 * 60);
  assert.equal(youtubeJob.retention?.artifactTtlSeconds, 6 * 60 * 60);
  assert.equal(youtubeJob.execution?.provenance?.provider, 'youtube-public-search');
  assert.equal(typeof youtubeJob.execution?.provenance?.attemptCount, 'number');
  assert.ok(Array.isArray(youtubeJob.execution?.provenance?.attemptedStrategies));
  assert.equal(Array.isArray(youtubeJob.artifacts), true);
  assert.ok(youtubeJob.artifacts.length >= 1);
  assert.equal(typeof youtubeJob.artifacts[0]?.expiresAt, 'string');
  assert.equal(typeof youtubeJob.result?.targetMetadata, 'object');
  if (youtubeJob.execution?.mode === 'provider') {
    assert.equal(typeof youtubeJob.result?.strategyUsed, 'string');
    assert.equal(typeof youtubeJob.result?.searchUrl, 'string');
    assert.ok(Array.isArray(youtubeJob.result?.attempts));
  } else {
    assert.equal(youtubeJob.result?.degraded, true);
  }

  const youtubeArtifact = youtubeJob.artifacts[0];
  const youtubeArtifactUnauthorized = await getJson(youtubeArtifact.url);
  assert.equal(youtubeArtifactUnauthorized.response.status, 401);
  assertEnvelope(youtubeArtifactUnauthorized.json);
  assert.equal(youtubeArtifactUnauthorized.json.error?.code, 'unauthorized');

  const youtubeArtifactResponse = await getJson(youtubeArtifact.url, { withApiKey: true });
  assert.equal(youtubeArtifactResponse.response.status, 200);
  assertEnvelope(youtubeArtifactResponse.json);
  assert.equal(typeof youtubeArtifactResponse.json.data?.artifact?.summary, 'string');
  assert.equal(typeof youtubeArtifactResponse.json.data?.metadata?.expiresAt, 'string');

  const snapifyBlocked = await postJson('/api/v1/seo-tools/snapify-capture-screenshot-save-pdf', {
    url: `${EVIDENCE_URL}/page`
  });
  assert.equal(snapifyBlocked.response.status, 400);
  assertEnvelope(snapifyBlocked.json);
  assert.equal(snapifyBlocked.json.error?.code, 'validation_error');

  const snapifyWorker = await postExternalJson(SCRAPER_URL, '/jobs/execute', {
    jobId: 'smoke-snapify',
    tool: 'snapify-capture-screenshot-save-pdf',
    payload: {
      urls: [`${EVIDENCE_URL}/page`]
    }
  });
  assert.equal(snapifyWorker.response.status, 200);
  assert.equal(snapifyWorker.json.execution?.mode, 'browser');
  assert.equal(snapifyWorker.json.execution?.readyForPublicLaunch, false);
  assert.ok(
    ['browser-rendered', 'browser-rendered-with-fallback'].includes(
      snapifyWorker.json.result?.captureMode
    )
  );
  assert.equal(snapifyWorker.json.result?.renderedArtifactsAvailable, true);
  assert.equal(snapifyWorker.json.result?.browserRuntimeAvailable, true);
  assert.equal(Array.isArray(snapifyWorker.json.result?.captures), true);
  assert.equal(snapifyWorker.json.result?.captures?.[0]?.success, true);
  assert.equal(snapifyWorker.json.result?.captures?.[0]?.renderMode, 'browser');
  assert.equal(snapifyWorker.json.result?.captures?.[0]?.renderedArtifactsAvailable, true);
  assert.equal(
    typeof snapifyWorker.json.result?.captures?.[0]?.artifacts?.screenshotId,
    'string'
  );
  assert.equal(typeof snapifyWorker.json.result?.captures?.[0]?.artifacts?.pdfId, 'string');
  assert.equal(snapifyWorker.json.result?.captures?.[0]?.evidence?.title, 'Smoke Evidence Page');
  assert.equal(
    snapifyWorker.json.result?.captures?.[0]?.evidence?.description,
    'Local smoke-test evidence page for snapify.'
  );
  assert.equal(snapifyWorker.json.result?.captures?.[0]?.evidence?.status, 200);
  assert.equal(Array.isArray(snapifyWorker.json.artifacts), true);
  assert.ok(
    snapifyWorker.json.artifacts.some(
      (artifact) => artifact.type === 'screenshot' && artifact.content?.mimeType === 'image/png'
    )
  );
  assert.ok(
    snapifyWorker.json.artifacts.some(
      (artifact) => artifact.type === 'pdf' && artifact.content?.mimeType === 'application/pdf'
    )
  );
  assert.ok(snapifyWorker.json.artifacts.some((artifact) => artifact.type === 'report'));

  console.log('smoke-tests: live routes ok');
} finally {
  await Promise.allSettled([
    closeServer(evidenceServer),
    stopProcess(scraper, 'scraper-service'),
    stopProcess(server, 'api-gateway')
  ]);
}
