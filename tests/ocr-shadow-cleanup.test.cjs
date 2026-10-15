'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {runCleanup}=require('../server/ocr-shadow-cleanup.cjs');
const path='2026-10-14-T/1/'+'a'.repeat(64)+'.jpg';
const old='2026-10-15T00:00:00Z',now=Date.parse('2026-11-20T12:00:00Z');
const initial={complete:true,jobs:[],objects:[{path,created_at:old}]};
test('dry run cannot delete',async()=>{
 let deleted=0;
 const r=await runCleanup({inventory:async()=>initial,fetchFresh:async()=>initial,remove:async()=>{deleted++;return {removed:true}},now});
 assert.equal(r.results[0].status,'would_delete');assert.equal(deleted,0);
});
test('delete double checks unchanged evidence and records audit',async()=>{
 const events=[];let deleted=0;
 const r=await runCleanup({mode:'delete',inventory:async()=>initial,fetchFresh:async()=>initial,remove:async p=>{assert.equal(p,path);deleted++;return {removed:true}},logger:async e=>events.push(e),now});
 assert.equal(deleted,1);assert.equal(events[0].status,'deleted');assert.equal(r.results[0].status,'deleted');
});
test('changing or incomplete inventory fails closed',async()=>{
 let deleted=0;
 const pending={complete:true,jobs:[{image_storage_path:path,state:'queued',updated_at:old}],objects:initial.objects};
 const r=await runCleanup({mode:'delete',inventory:async()=>initial,fetchFresh:async()=>pending,remove:async()=>{deleted++;return {removed:true}},now});
 assert.equal(r.results[0].status,'skipped_changed');assert.equal(deleted,0);
 await assert.rejects(runCleanup({mode:'delete',inventory:async()=>({complete:false,jobs:[],objects:initial.objects}),fetchFresh:async()=>initial,remove:async()=>{},now}),/Complete inventory/);
});
test('reject invalid mode and missing dependencies',async()=>{
 await assert.rejects(runCleanup({mode:'purge',inventory:async()=>initial,fetchFresh:async()=>initial,remove:async()=>{},now}),/Unsupported/);
 await assert.rejects(runCleanup({mode:'delete'}),/Missing/);
});
