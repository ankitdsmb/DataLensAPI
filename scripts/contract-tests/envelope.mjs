import assert from 'node:assert/strict';
import { createErrorResponse, createResponse } from '../../packages/scraping-core/dist/scraping-core/src/apiWrapper.js';
import { RequestValidationError } from '../../packages/scraping-core/dist/scraping-core/src/validation.js';

function assertEnvelopeShape(response) {
  assert.equal(typeof response.success, 'boolean');
  assert.ok(response.metadata);
  assert.equal(typeof response.metadata.request_id, 'string');
  assert.equal(typeof response.metadata.timestamp, 'string');
  assert.equal(typeof response.metadata.execution_time_ms, 'number');
  assert.equal(typeof response.metadata.tool_version, 'string');
  assert.equal(response.metadata.source, 'datalens');
  assert.ok(Array.isArray(response.metadata.warnings));
  assert.ok(Object.prototype.hasOwnProperty.call(response, 'data'));
  assert.ok(Object.prototype.hasOwnProperty.call(response, 'error'));
  assert.ok(Object.prototype.hasOwnProperty.call(response, 'job'));
  assert.ok(Object.prototype.hasOwnProperty.call(response, 'pagination'));
}

const startTime = Date.now() - 25;
const successResponse = createResponse({ ok: true }, startTime);
assertEnvelopeShape(successResponse);
assert.equal(successResponse.success, true);
assert.equal(successResponse.error, null);

const validationError = new RequestValidationError('url is required', { field: 'url' });
const errorResponse = createErrorResponse(validationError, startTime);
assertEnvelopeShape(errorResponse);
assert.equal(errorResponse.success, false);
assert.equal(errorResponse.error.code, 'validation_error');

console.log('contract-tests: envelope ok');
