'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {inspect}=require('../../scripts/gate-e/ci-policy.cjs');
const id='2026-10-12-M';
const three=['data/manifest.json','data/incoming/'+id+'.csv','data/intake-proofs/'+id+'.json'];
test('unrelated PR passes globally running check',()=>assert.equal(inspect({branch:'fix/ux',paths:['app.js']}).ok,true));
test('regular PR modifying manifest is blocked',()=>assert.equal(inspect({branch:'fix/ux',paths:['data/manifest.json']}).reason,'STAT_DATA_OUTSIDE_INTAKE'));
test('regular PR modifying proof is blocked',()=>assert.equal(inspect({branch:'fix/ux',paths:['data/intake-proofs/x.json']}).ok,false));
test('well-formed intake PR is allowed to reach strict validators',()=>assert.equal(inspect({branch:'stat-intake/'+id,paths:three}).ok,true));
test('intake PR changing application code is blocked',()=>assert.equal(inspect({branch:'stat-intake/'+id,paths:[...three,'app.js']}).reason,'INVALID_INTAKE_PATHS'));
test('intake PR altering a historical source is blocked',()=>assert.equal(inspect({branch:'stat-intake/'+id,paths:[...three,'data/events.csv']}).ok,false));
test('wrong event ID is blocked',()=>assert.equal(inspect({branch:'stat-intake/'+id,paths:['data/manifest.json','data/incoming/2026-10-13-M.csv','data/intake-proofs/2026-10-13-M.json']}).ok,false));
test('malformed intake branch is blocked',()=>assert.equal(inspect({branch:'stat-intake/garbage',paths:three}).reason,'INVALID_EVENT_BRANCH'));

test('ordinary PR cannot mutate canonical historical CSV',()=>assert.equal(inspect({branch:'fix/bypass',paths:['data/events.csv']}).ok,false));
