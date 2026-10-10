'use strict';
const assert=require('node:assert/strict');
const ALLOWED_SCHEMA='roleta_audit';
const FORBIDDEN_RUNTIME_ROLES=new Set(['postgres','service_role','anon','authenticated','supabase_admin']);
function assertSharedDatabaseIsolation(config){
 assert(config&&typeof config==='object','config required');
 assert.equal(config.schema,ALLOWED_SCHEMA,'Roleta must use private roleta_audit schema');
 assert.equal(config.apiExposed,false,'Roleta schema must not be exposed through PostgREST');
 assert.equal(config.directBrowserAccess,false,'Direct browser DB access forbidden');
 assert.equal(config.runtimeBypassRls,false,'Runtime role must not bypass RLS');
 assert.equal(config.runtimeCanAccessDiscador,false,'Runtime must not access Discador data');
 assert.equal(config.runtimeCanWriteDirectly,false,'Runtime must use audited append function');
 assert.equal(config.migrationApproved,true,'Shared production database migration requires explicit approval');
 assert(typeof config.runtimeRole==='string'&&config.runtimeRole.length>0,'dedicated runtime role required');
 assert(!FORBIDDEN_RUNTIME_ROLES.has(config.runtimeRole),'privileged or shared runtime role forbidden');
 return true;
}
module.exports={assertSharedDatabaseIsolation};
