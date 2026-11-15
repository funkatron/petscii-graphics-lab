import {test} from 'node:test';
import assert from 'node:assert/strict';
import {APP_VERSION} from '../app-version.js';

test('APP_VERSION is semver',()=>{
 assert.match(APP_VERSION,/^\d+\.\d+\.\d+$/);
});