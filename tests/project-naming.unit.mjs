import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  PROJECT_NAME_ADJECTIVES,
  PROJECT_NAME_NOUNS,
  projectNameCombinationCount,
  randomProjectFilename,
  regenerateProjectFilename,
} from '../project-naming.js';

test('default name uses first adjective and noun when random is zero', () => {
  const zero = (buf) => {
    buf.fill(0);
    return buf;
  };
  assert.equal(randomProjectFilename(zero), 'amber-otter');
});

test('name space is large enough to limit casual collisions', () => {
  assert.equal(PROJECT_NAME_ADJECTIVES.length, PROJECT_NAME_NOUNS.length);
  assert.ok(projectNameCombinationCount() >= 2000);
});

test('random names match adjective-noun pattern', () => {
  let n = 0;
  const rng = (buf) => {
    for (let i = 0; i < buf.length; i++) buf[i] = (n++ * 0x9e3779b9) >>> 0;
    return buf;
  };
  for (let i = 0; i < 200; i++) {
    const name = randomProjectFilename(rng);
    assert.match(name, /^[a-z]+-[a-z]+$/);
    const [adj, noun] = name.split('-');
    assert.ok(PROJECT_NAME_ADJECTIVES.includes(adj));
    assert.ok(PROJECT_NAME_NOUNS.includes(noun));
  }
});

test('regeneration never returns the previous stem', () => {
  const zero = (buf) => {
    buf.fill(0);
    return buf;
  };
  assert.notEqual(regenerateProjectFilename('amber-otter', zero), 'amber-otter');
  for (let i = 0; i < 100; i++) {
    const name = randomProjectFilename();
    assert.notEqual(regenerateProjectFilename(name), name);
  }
});