'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assertDedicatedSupabaseProject}=require('../../security/supabase-project-guard.cjs');
test('F2-11 Discador Supabase cannot be used by Roleta',()=>{
 assert.throws(()=>assertDedicatedSupabaseProject('uobxxgzshrmbtjfdolxd'),/SECURITY_BLOCK/);
 assert.throws(()=>assertDedicatedSupabaseProject(''),/required/);
 assert.throws(()=>assertDedicatedSupabaseProject(undefined),/required/);
 assert.equal(assertDedicatedSupabaseProject('abcdefghijklmnopqrst'),'abcdefghijklmnopqrst');
});
