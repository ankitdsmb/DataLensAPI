import assert from 'node:assert/strict';
import { enforceLaunchPolicy, resolveLaunchPolicy } from '../../packages/scraping-core/dist/scraping-core/src/launchGuard.js';
import { createToolPolicy } from '../../packages/scraping-core/dist/scraping-core/src/policy.js';

function withEnv(name, value, fn) {
  const previous = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  }
}

const previewPolicy = createToolPolicy({
  timeoutMs: 10000,
  maxPayloadBytes: 64 * 1024,
  maxUrlCount: 1,
  anonymous: false,
  authRequired: true,
  rateLimitPerMinute: 2,
  maxConcurrentRequests: 1,
  cacheTtlSeconds: 60
});

withEnv('FREE_TIER_LAUNCH_MODE', 'true', () => {
  const snapifyReq = new Request('http://localhost/api/v1/seo-tools/snapify-capture-screenshot-save-pdf', {
    method: 'POST',
    headers: { 'x-api-key': 'contract-key' }
  });
  const youtubeReq = new Request('http://localhost/api/v1/seo-tools/youtube-rank-checker', {
    method: 'POST',
    headers: { 'x-api-key': 'contract-key' }
  });

  assert.equal(resolveLaunchPolicy(snapifyReq, previewPolicy).visibility, 'internal');
  assert.equal(resolveLaunchPolicy(youtubeReq, previewPolicy).visibility, 'internal');
});

withEnv('FREE_TIER_LAUNCH_MODE', 'false', () =>
  withEnv('FREE_TIER_API_KEYS', 'contract-key', () => {
    const snapifyReq = new Request('http://localhost/api/v1/seo-tools/snapify-capture-screenshot-save-pdf', {
      method: 'POST',
      headers: { 'x-api-key': 'contract-key' }
    });
    const youtubeReq = new Request('http://localhost/api/v1/seo-tools/youtube-rank-checker', {
      method: 'POST',
      headers: { 'x-api-key': 'contract-key' }
    });

    const resolvedSnapify = resolveLaunchPolicy(snapifyReq, previewPolicy);
    const resolvedYoutube = resolveLaunchPolicy(youtubeReq, previewPolicy);

    assert.equal(resolvedSnapify.visibility, 'public');
    assert.equal(resolvedYoutube.visibility, 'public');
    assert.equal(resolvedSnapify.authRequired, true);
    assert.equal(resolvedYoutube.authRequired, true);

    assert.doesNotThrow(() => enforceLaunchPolicy(snapifyReq, resolvedSnapify));
    assert.doesNotThrow(() => enforceLaunchPolicy(youtubeReq, resolvedYoutube));

    const unauthorizedSnapifyReq = new Request(
      'http://localhost/api/v1/seo-tools/snapify-capture-screenshot-save-pdf',
      { method: 'POST' }
    );
    const unauthorizedYoutubeReq = new Request('http://localhost/api/v1/seo-tools/youtube-rank-checker', {
      method: 'POST'
    });

    assert.throws(
      () => enforceLaunchPolicy(unauthorizedSnapifyReq, resolveLaunchPolicy(unauthorizedSnapifyReq, previewPolicy)),
      (error) => {
        assert.equal(error.code, 'unauthorized');
        return true;
      }
    );
    assert.throws(
      () => enforceLaunchPolicy(unauthorizedYoutubeReq, resolveLaunchPolicy(unauthorizedYoutubeReq, previewPolicy)),
      (error) => {
        assert.equal(error.code, 'unauthorized');
        return true;
      }
    );
  })
);

console.log('contract-tests: launch guard ok');
