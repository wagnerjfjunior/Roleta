'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const p=fs.readFileSync('.github/workflows/gate-e-intake-integrity.yml','utf8');
test('PR guard executes trusted validators from pinned base SHA',()=>{
 assert.match(p,/git archive "\$BASE_SHA" \| tar -x -C "\$TRUST_ROOT"/);
 assert.match(p,/node "\$TRUST_ROOT\/scripts\/gate-e\/ci-policy\.cjs"/);
 assert.doesNotMatch(p,/^\s+node scripts\/gate-e\/ci-policy\.cjs$/m);
});
test('bootstrap refuses any change under data directory',()=>{
 assert.match(p,/git cat-file -e "\$\{BASE_SHA\}:scripts\/gate-e\/ci-policy\.cjs"/);
 assert.match(p,/git diff --name-only "\$BASE_SHA" "\$HEAD_SHA" -- data\//);
 assert.match(p,/BLOCKED: protected data changed before trusted gate is installed/);
});
