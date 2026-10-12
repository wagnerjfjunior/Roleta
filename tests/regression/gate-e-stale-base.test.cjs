'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inspect } = require('../../scripts/gate-e/check-stale-base.cjs');

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);

function simulate({ mergeBase=A, commits=1, merges='' }={}) {
  return inspect({
    base: 'main',
    head: 'HEAD',
    gitCall: (...args) => {
      if (args[0] === 'rev-parse') {
        return args[2] === 'main^{commit}' ? A : B;
      }
      if (args[0] === 'merge-base') return mergeBase;
      if (args[0] === 'rev-list' && args[1] === '--count') {
        return String(commits);
      }
      if (args[0] === 'rev-list' && args[1] === '--min-parents=2') {
        return merges;
      }
      throw Error('Unexpected Git operation');
    }
  });
}

test('one commit based on current main is accepted', () => {
  assert.equal(simulate().ok, true);
});

test('three sequential commits are accepted', () => {
  assert.equal(simulate({ commits:3 }).ok, true);
});

test('stale base is rejected', () => {
  const result = simulate({ mergeBase:C, commits:2 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'STALE_BASE');
});

test('merge commit is rejected', () => {
  const result = simulate({ commits:3, merges:C });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'MERGE_COMMIT_NOT_ALLOWED');
});

test('proposal without new commits is rejected', () => {
  const result = simulate({ commits:0 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'NO_PROPOSAL_COMMITS');
});
