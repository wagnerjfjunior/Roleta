'use strict';

const { execFileSync } = require('node:child_process');

function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8'
  }).trim();
}

function inspect({
  base = 'origin/main',
  head = 'HEAD',
  gitCall = git
} = {}) {
  const baseSha = gitCall(
    'rev-parse', '--verify', base + '^{commit}'
  );

  const headSha = gitCall(
    'rev-parse', '--verify', head + '^{commit}'
  );

  const mergeBase = gitCall(
    'merge-base', baseSha, headSha
  );

  const commits = Number(gitCall(
    'rev-list', '--count', baseSha + '..' + headSha
  ));

  const merges = gitCall(
    'rev-list', '--min-parents=2',
    baseSha + '..' + headSha
  );

  let reason = null;

  if (mergeBase !== baseSha) {
    reason = 'STALE_BASE';
  } else if (!Number.isSafeInteger(commits) || commits < 1) {
    reason = 'NO_PROPOSAL_COMMITS';
  } else if (merges.trim()) {
    reason = 'MERGE_COMMIT_NOT_ALLOWED';
  }

  return {
    ok: reason === null,
    reason,
    baseSha,
    headSha,
    mergeBase,
    commits
  };
}

if (require.main === module) {
  try {
    const result = inspect({
      base: process.argv[2] || 'origin/main',
      head: process.argv[3] || 'HEAD'
    });

    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error('Gate E:', error.message);
    process.exitCode = 2;
  }
}

module.exports = { inspect };
