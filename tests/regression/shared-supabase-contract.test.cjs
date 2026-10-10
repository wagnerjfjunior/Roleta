'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assertSharedDatabaseIsolation}=require('../../security/shared-supabase-contract.cjs');
const safe={schema:'roleta_audit',apiExposed:false,directBrowserAccess:false,runtimeBypassRls:false,runtimeCanAccessDiscador:false,runtimeCanWriteDirectly:false,migrationApproved:true,runtimeRole:'roleta_runtime'};
test('F2-11 shared Supabase isolation requires explicit migration approval',()=>{
 assert.throws(()=>assertSharedDatabaseIsolation({...safe,migrationApproved:false}),/approval/);
 assert.equal(assertSharedDatabaseIsolation(safe),true);
});
test('F2-11 reject cross-app grants, public schema and privileged roles',()=>{
 for(const [key,value] of [['schema','public'],['apiExposed',true],['directBrowserAccess',true],['runtimeBypassRls',true],['runtimeCanAccessDiscador',true],['runtimeCanWriteDirectly',true],['runtimeRole','service_role'],['runtimeRole','postgres']]){
  assert.throws(()=>assertSharedDatabaseIsolation({...safe,[key]:value}),undefined,key);
 }
});
