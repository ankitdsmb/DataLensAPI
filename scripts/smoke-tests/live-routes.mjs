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

const PORT = process.env.SMOKE_PORT ?? await resolvePort('3101');
const SCRAPER_PORT = process.env.SMOKE_SCRAPER_PORT ?? await resolvePort('3103');
const EVIDENCE_PORT = process.env.SMOKE_EVIDENCE_PORT ?? await resolvePort('3104');
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

async function postJson(path, body, options = {}) {
  const headers = { 'content-type': 'application/json' };
  if (options.apiKey !== null) {
    headers['x-api-key'] = options.apiKey ?? 'smoke-key';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const json = await response.json();
  return { response, json };
}

async function getJson(path, options = {}) {
  const headers = {};
  if (options.withApiKey) {
    headers['x-api-key'] = options.apiKey ?? 'smoke-key';
  }
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

    if (req.url === '/tall-page') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html>
<html lang="en">
  <head>
    <title>Tall Smoke Evidence Page</title>
    <meta name="description" content="Tall local smoke-test page for snapify budget fallback." />
    <style>
      body { margin: 0; font-family: sans-serif; }
      .tower { height: 14000px; background: linear-gradient(#f8fafc, #e2e8f0); }
    </style>
  </head>
  <body>
    <main class="tower">
      <h1>Tall Smoke Evidence</h1>
      <p>This page intentionally exceeds the snapify render-height budget.</p>
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
    FREE_TIER_API_KEYS: 'smoke-key,other-smoke-key',
    SCRAPER_SERVICE_URL: SCRAPER_URL,
    SNAPIFY_CAPTURE_HOST_ALLOWLIST: '127.0.0.1,localhost'
  }
});

server.stdout.on('data', (chunk) => process.stdout.write(`[smoke:next] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[smoke:next] ${chunk}`));

const evidenceServer = await createEvidenceServer();

try {
  process.stdout.write(
    `[smoke] using ports next=${PORT} scraper=${SCRAPER_PORT} evidence=${EVIDENCE_PORT}\n`
  );
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

  const youtubeValidation = await postJson('/api/v1/seo-tools/youtube-rank-checker', {
    keyword: 'test keyword',
    videoUrl: 'https://example.com/watch?v=dQw4w9WgXcQ'
  });
  assert.equal(youtubeValidation.response.status, 400);
  assertEnvelope(youtubeValidation.json);
  assert.equal(youtubeValidation.json.error?.code, 'validation_error');

  const queued = await postJson('/api/v1/seo-tools/youtube-rank-checker', {
    keyword: 'test keyword',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  });
  assert.equal(queued.response.status, 200);
  assertEnvelope(queued.json);
  const jobId = queued.json.data?.job?.id;
  assert.equal(typeof jobId, 'string');
  assert.equal(queued.json.data?.contract?.launchRecommendation, 'credentialed_preview_only');
  assert.equal(queued.json.data?.job?.retention?.artifactAccess, 'authenticated');
  assert.equal(queued.json.data?.job?.retention?.jobTtlSeconds, 12 * 60 * 60);
  assert.equal(queued.json.data?.job?.retention?.artifactTtlSeconds, 6 * 60 * 60);
  assert.equal(queued.json.data?.job?.access?.scope, 'submitter');
  assert.equal(queued.json.data?.job?.access?.submitterBound, true);

  const youtubeUnauthorizedStatus = await getJson(`/api/v1/jobs/${jobId}`);
  assert.equal(youtubeUnauthorizedStatus.response.status, 401);
  assertEnvelope(youtubeUnauthorizedStatus.json);
  assert.equal(youtubeUnauthorizedStatus.json.error?.code, 'unauthorized');

  const youtubeWrongKeyStatus = await getJson(`/api/v1/jobs/${jobId}`, {
    withApiKey: true,
    apiKey: 'other-smoke-key'
  });
  assert.equal(youtubeWrongKeyStatus.response.status, 403);
  assertEnvelope(youtubeWrongKeyStatus.json);
  assert.equal(youtubeWrongKeyStatus.json.error?.code, 'forbidden');

  const youtubeJob = await waitForJob(jobId);
  assert.equal(youtubeJob.status, 'succeeded');
  assert.ok(['provider', 'browser', 'simulated'].includes(youtubeJob.execution?.mode));
  assert.equal(youtubeJob.execution?.readyForPublicLaunch, false);
  assert.equal(youtubeJob.retention?.artifactAccess, 'authenticated');
  assert.equal(youtubeJob.access?.scope, 'submitter');
  assert.equal(youtubeJob.access?.submitterBound, true);
  assert.equal(youtubeJob.retention?.jobTtlSeconds, 12 * 60 * 60);
  assert.equal(youtubeJob.retention?.artifactTtlSeconds, 6 * 60 * 60);
  assert.equal(youtubeJob.execution?.provenance?.provider, 'youtube-public-search');
  assert.equal(typeof youtubeJob.execution?.provenance?.attemptCount, 'number');
  assert.ok(Array.isArray(youtubeJob.execution?.provenance?.attemptedStrategies));
  assert.equal(Array.isArray(youtubeJob.artifacts), true);
  assert.ok(youtubeJob.artifacts.length >= 1);
  assert.equal(typeof youtubeJob.artifacts[0]?.expiresAt, 'string');
  assert.equal(typeof youtubeJob.result?.targetMetadata, 'object');
  if (youtubeJob.execution?.mode === 'provider' || youtubeJob.execution?.mode === 'browser') {
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

  const youtubeArtifactWrongKey = await getJson(youtubeArtifact.url, {
    withApiKey: true,
    apiKey: 'other-smoke-key'
  });
  assert.equal(youtubeArtifactWrongKey.response.status, 403);
  assertEnvelope(youtubeArtifactWrongKey.json);
  assert.equal(youtubeArtifactWrongKey.json.error?.code, 'forbidden');

  const youtubeArtifactResponse = await getJson(youtubeArtifact.url, { withApiKey: true });
  assert.equal(youtubeArtifactResponse.response.status, 200);
  assertEnvelope(youtubeArtifactResponse.json);
  assert.equal(typeof youtubeArtifactResponse.json.data?.artifact?.summary, 'string');
  assert.equal(typeof youtubeArtifactResponse.json.data?.metadata?.expiresAt, 'string');

  const snapifyQueued = await postJson('/api/v1/seo-tools/snapify-capture-screenshot-save-pdf', {
    url: `${EVIDENCE_URL}/page`
  });
  assert.equal(snapifyQueued.response.status, 200);
  assertEnvelope(snapifyQueued.json);
  const snapifyJobId = snapifyQueued.json.data?.job?.id;
  assert.equal(typeof snapifyJobId, 'string');
  assert.equal(snapifyQueued.json.data?.contract?.launchRecommendation, 'authenticated_beta');
  assert.equal(snapifyQueued.json.data?.job?.retention?.artifactAccess, 'authenticated');
  assert.equal(snapifyQueued.json.data?.job?.retention?.jobTtlSeconds, 6 * 60 * 60);
  assert.equal(snapifyQueued.json.data?.job?.retention?.artifactTtlSeconds, 2 * 60 * 60);
  assert.equal(snapifyQueued.json.data?.job?.access?.scope, 'submitter');
  assert.equal(snapifyQueued.json.data?.job?.access?.submitterBound, true);

  const snapifyUnauthorizedStatus = await getJson(`/api/v1/jobs/${snapifyJobId}`);
  assert.equal(snapifyUnauthorizedStatus.response.status, 401);
  assertEnvelope(snapifyUnauthorizedStatus.json);
  assert.equal(snapifyUnauthorizedStatus.json.error?.code, 'unauthorized');

  const snapifyWrongKeyStatus = await getJson(`/api/v1/jobs/${snapifyJobId}`, {
    withApiKey: true,
    apiKey: 'other-smoke-key'
  });
  assert.equal(snapifyWrongKeyStatus.response.status, 403);
  assertEnvelope(snapifyWrongKeyStatus.json);
  assert.equal(snapifyWrongKeyStatus.json.error?.code, 'forbidden');

  const snapifyJob = await waitForJob(snapifyJobId);
  assert.equal(snapifyJob.status, 'succeeded');
  assert.ok(['browser', 'provider'].includes(snapifyJob.execution?.mode));
  assert.equal(snapifyJob.execution?.readyForPublicLaunch, true);
  assert.equal(snapifyJob.retention?.artifactAccess, 'authenticated');
  assert.equal(snapifyJob.access?.scope, 'submitter');
  assert.equal(snapifyJob.access?.submitterBound, true);
  assert.equal(snapifyJob.retention?.jobTtlSeconds, 6 * 60 * 60);
  assert.equal(snapifyJob.retention?.artifactTtlSeconds, 2 * 60 * 60);
  assert.equal(Array.isArray(snapifyJob.artifacts), true);
  assert.ok(snapifyJob.artifacts.length >= 1);
  assert.equal(typeof snapifyJob.artifacts[0]?.expiresAt, 'string');
  assert.ok(
    ['browser-rendered', 'browser-rendered-with-fallback'].includes(
      snapifyJob.result?.captureMode
    )
  );
  assert.equal(snapifyJob.result?.renderedArtifactsAvailable, true);
  assert.equal(snapifyJob.result?.browserRuntimeAvailable, true);
  assert.equal(Array.isArray(snapifyJob.result?.captures), true);
  assert.equal(snapifyJob.result?.captures?.[0]?.success, true);
  assert.equal(snapifyJob.result?.captures?.[0]?.renderMode, 'browser');
  assert.equal(snapifyJob.result?.captures?.[0]?.renderedArtifactsAvailable, true);
  assert.equal(
    typeof snapifyJob.result?.captures?.[0]?.artifacts?.screenshotId,
    'string'
  );
  assert.equal(typeof snapifyJob.result?.captures?.[0]?.artifacts?.pdfId, 'string');
  assert.equal(snapifyJob.result?.captures?.[0]?.evidence?.title, 'Smoke Evidence Page');
  assert.equal(
    snapifyJob.result?.captures?.[0]?.evidence?.description,
    'Local smoke-test evidence page for snapify.'
  );
  assert.equal(snapifyJob.result?.captures?.[0]?.evidence?.status, 200);

  const snapifyArtifact = snapifyJob.artifacts.find((artifact) => artifact.type === 'report');
  assert.ok(snapifyArtifact);

  const snapifyArtifactUnauthorized = await getJson(snapifyArtifact.url);
  assert.equal(snapifyArtifactUnauthorized.response.status, 401);
  assertEnvelope(snapifyArtifactUnauthorized.json);
  assert.equal(snapifyArtifactUnauthorized.json.error?.code, 'unauthorized');

  const snapifyArtifactWrongKey = await getJson(snapifyArtifact.url, {
    withApiKey: true,
    apiKey: 'other-smoke-key'
  });
  assert.equal(snapifyArtifactWrongKey.response.status, 403);
  assertEnvelope(snapifyArtifactWrongKey.json);
  assert.equal(snapifyArtifactWrongKey.json.error?.code, 'forbidden');

  const snapifyArtifactResponse = await getJson(snapifyArtifact.url, { withApiKey: true });
  assert.equal(snapifyArtifactResponse.response.status, 200);
  assertEnvelope(snapifyArtifactResponse.json);
  assert.equal(typeof snapifyArtifactResponse.json.data?.metadata?.expiresAt, 'string');

  assert.ok(
    snapifyJob.artifacts.some((artifact) => artifact.type === 'screenshot')
  );
  assert.ok(snapifyJob.artifacts.some((artifact) => artifact.type === 'pdf'));
  assert.ok(snapifyJob.artifacts.some((artifact) => artifact.type === 'report'));

  const tallSnapifyQueued = await postJson('/api/v1/seo-tools/snapify-capture-screenshot-save-pdf', {
    url: `${EVIDENCE_URL}/tall-page`
  });
  assert.equal(tallSnapifyQueued.response.status, 200);
  assertEnvelope(tallSnapifyQueued.json);
  const tallSnapifyJobId = tallSnapifyQueued.json.data?.job?.id;
  assert.equal(typeof tallSnapifyJobId, 'string');

  const tallSnapifyJob = await waitForJob(tallSnapifyJobId);
  assert.equal(tallSnapifyJob.status, 'succeeded');
  assert.equal(tallSnapifyJob.execution?.mode, 'browser');
  assert.equal(tallSnapifyJob.execution?.readyForPublicLaunch, false);
  assert.equal(tallSnapifyJob.result?.renderedArtifactsAvailable, false);
  assert.equal(tallSnapifyJob.result?.captureMode, 'html-evidence-only');
  assert.equal(tallSnapifyJob.result?.captures?.[0]?.fallbackUsed, true);
  assert.match(
    tallSnapifyJob.result?.captures?.[0]?.renderError ?? '',
    /exceed capture budget|exceeds capture budget|exceeds byte budget/
  );
  assert.ok(tallSnapifyJob.artifacts.every((artifact) => artifact.type === 'report'));

  console.log('smoke-tests: live routes ok');
} finally {
  await Promise.allSettled([
    closeServer(evidenceServer),
    stopProcess(scraper, 'scraper-service'),
    stopProcess(server, 'api-gateway')
  ]);
}
