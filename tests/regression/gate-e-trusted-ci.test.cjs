
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const p=fs.readFileSync('.github/workflows/gate-e-intake-integrity.yml','utf8');
test('protected workflow runs for conflicting PRs from base, without candidate execution',()=>{
 assert.match(p,/pull_request_target:/);
 assert.match(p,/ref: \$\{\{ github.event.pull_request.base.sha/);
 assert.match(p,/persist-credentials: false/);
 assert.match(p,/GATE_E_TRUSTED_CHECKOUT: base/);
 assert.doesNotMatch(p,/git checkout|npm |node --test/);
 assert.match(p,/node scripts\/gate-e\/ci-policy.cjs/);
});
