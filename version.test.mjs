// Selbsttest: node version.test.mjs
import assert from 'node:assert/strict';
import { neuer, VERSION } from './version.js';

assert.ok(/^\d+\.\d+\.\d+$/.test(VERSION));
assert.equal(neuer('1.5.0', '1.4.0'), true);
assert.equal(neuer('v1.10.0', '1.9.2'), true);
assert.equal(neuer('1.4.0', '1.4.0'), false);
assert.equal(neuer('1.3.9', '1.4.0'), false);
assert.equal(neuer('1.4.0.1', '1.4.0'), true);
assert.equal(neuer('2', '1.9.9'), true);
assert.equal(neuer('android-build-9', '1.4.0'), false);
assert.equal(neuer('', '1.4.0'), false);
assert.equal(neuer(undefined, '1.4.0'), false);
console.log('version: alle Tests ok');
