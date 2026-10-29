import test from 'node:test';
import assert from 'node:assert/strict';
import { durationToMs, redactUri, buildConfig } from '../src/config.js';
test('configuration keeps duration defaults and redacts Mongo credentials', () => {
  assert.equal(durationToMs('12h'), 43_200_000);
  assert.equal(durationToMs('invalid'), null);
  assert.equal(redactUri('mongodb://alice:secret@localhost/db'), 'mongodb://***:***@localhost/db');
  assert.equal(buildConfig({ NODE_ENV: 'test' }).values.PORT, 4002);
});
