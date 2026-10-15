'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {planCleanup}=require('../server/ocr-shadow-retention.cjs');
const now=Date.parse('2026-11-20T12:00:00Z');
const path='2026-10-14-T/1/'+'a'.repeat(64)+'.jpg';
const old='2026-10-15T00:00:00Z',young='2026-11-20T11:30:00Z';
test('orphan aged 24h is scheduled for deletion, no side effects',()=>{
 const r=planCleanup({jobs:[],objects:[{path,created_at:old}],now});
 assert.deepEqual(r.deletions,[{path,reason:'orphan'}]);
});
test('new orphan and pending reviews are retained',()=>{
 const orphan=planCleanup({jobs:[],objects:[{path,created_at:young}],now});
 assert.equal(orphan.deletions.length,0);
 for(const state of ['queued','needs_review','processing']){
  const r=planCleanup({jobs:[{image_storage_path:path,state,updated_at:old}],objects:[{path,created_at:old}],now});
  assert.equal(r.deletions.length,0);
 }
});
test('confirmed evidence only deletes after retention window',()=>{
 const expired=planCleanup({jobs:[{image_storage_path:path,state:'confirmed',updated_at:old}],objects:[{path,created_at:old}],now});
 assert.deepEqual(expired.deletions,[{path,reason:'expired'}]);
 const recent=planCleanup({jobs:[{image_storage_path:path,state:'confirmed',updated_at:young}],objects:[{path,created_at:old}],now});
 assert.equal(recent.deletions.length,0);
});
test('never delete invalid paths or ambiguous states',()=>{
 const r=planCleanup({jobs:[{image_storage_path:path,state:'unknown',updated_at:old}],objects:[{path,created_at:old},{path:'../other.jpg',created_at:old}],now});
 assert.equal(r.deletions.length,0);
 assert.equal(r.ambiguous.length,2);
});
test('invalid policy is blocked',()=>{
 assert.throws(()=>planCleanup({jobs:[],objects:[],now,retentionDays:0}),/policy/);
 assert.throws(()=>planCleanup({jobs:[],objects:[],now,orphanHours:1}),/policy/);
});
