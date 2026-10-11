'use strict';
// Dedicated server-only DB client; never use postgres, service_role or anon.
let pool;
function databaseUrl(env=process.env){
 const url=env.ROLETA_V2_DATABASE_URL;
 if(typeof url!=='string'||!url)throw Error('F2-12 database credential not configured');
 const u=new URL(url);
 if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname||!u.username||!u.password)
  throw Error('F2-12 database credential invalid');
 if(['postgres','service_role','anon','authenticated','supabase_admin','roleta_append_owner','roleta_runtime'].includes(decodeURIComponent(u.username)))
  throw Error('F2-12 elevated or non-login database user rejected');
 if(u.searchParams.get('sslmode')!=='verify-full')
  throw Error('F2-12 verified TLS is mandatory');
 return url;
}
function getPool({env=process.env,loadPg=()=>require('pg')}={}){
 const connectionString=databaseUrl(env);
 if(!pool){
  const {Pool}=loadPg();
  pool=new Pool({connectionString,ssl:{rejectUnauthorized:true},max:2,
    connectionTimeoutMillis:5000,idleTimeoutMillis:5000,
    statement_timeout:8000,query_timeout:10000,application_name:'roleta-f2-12-v2'});
 }
 return pool;
}
async function appendV2(command,{env=process.env,getPoolFn=getPool}={}){
 if(env.ROLETA_V2_WRITES_ENABLED!=='true')throw Error('F2-12 writes disabled');
 if(!command||typeof command.sql!=='string'||!Array.isArray(command.params)||command.params.length!==9
   ||!command.sql.startsWith('SELECT roleta_audit.append_authenticated_person_evidence_v2('))
  throw Error('unsupported F2-12 SQL');
 // Validate credential even if pool is injected; never silently use admin.
 databaseUrl(env);
 const response=await getPoolFn({env}).query(command.sql,command.params);
 const id=response?.rows?.[0]?.evidence_id;
 if(!/^\d+$/.test(String(id)))throw Error('invalid F2-12 append result');
 return String(id);
}
module.exports={databaseUrl,getPool,appendV2};
