import assert from 'node:assert/strict';
import {
  RequestValidationError,
  assertHttpUrl,
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

console.log('contract-tests: validation ok');
