import assert from 'node:assert/strict';
import {
  RequestValidationError,
  assertHttpUrl,
  assertPublicHttpUrl,
  normalizeKeywordInputs,
  optionalIntegerField,
  requireAllowedFields
} from '../../packages/scraping-core/dist/scraping-core/src/validation.js';

const body = {
  keyword: 'seo',
  keywords: ['audit', 'checker'],
  limit: 5
};

const keywords = normalizeKeywordInputs(body);
assert.deepEqual(keywords, ['seo', 'audit', 'checker']);
assert.equal(optionalIntegerField(body, 'limit', { min: 1, max: 10 }), 5);
assert.equal(assertHttpUrl('https://example.com/path'), 'https://example.com/path');
assert.equal(assertPublicHttpUrl('https://example.com/path'), 'https://example.com/path');
assert.equal(
  assertPublicHttpUrl('http://127.0.0.1:3104/page', { allowHosts: ['127.0.0.1'] }),
  'http://127.0.0.1:3104/page'
);

assert.throws(() => requireAllowedFields({ keyword: 'x', noise: true }, ['keyword']), (error) => {
  assert.ok(error instanceof RequestValidationError);
  assert.equal(error.code, 'validation_error');
  assert.equal(error.status, 400);
  return true;
});

assert.throws(() => assertHttpUrl('ftp://example.com'), (error) => {
  assert.ok(error instanceof RequestValidationError);
  assert.equal(error.code, 'validation_error');
  return true;
});

assert.throws(() => assertPublicHttpUrl('http://localhost:3104/page'), (error) => {
  assert.ok(error instanceof RequestValidationError);
  assert.equal(error.code, 'validation_error');
  return true;
});

assert.throws(() => assertPublicHttpUrl('http://127.0.0.1:3104/page'), (error) => {
  assert.ok(error instanceof RequestValidationError);
  assert.equal(error.code, 'validation_error');
  return true;
});

console.log('contract-tests: validation ok');
