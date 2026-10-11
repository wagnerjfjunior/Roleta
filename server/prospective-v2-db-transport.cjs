'use strict';
// Dedicated server-only DB client; never use postgres, service_role or anon.
let pool;
const ALLOWED_APPEND_SQL='SELECT roleta_audit.append_authenticated_person_evidence_v2($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) AS evidence_id';
function databaseUrl(env=process.env){
 const url=env.ROLETA_V2_DATABASE_URL;
 if(typeof url!=='string'||!url)throw Error('F2-12 database credential not configured');
 const u=new URL(url);
 if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname||!u.username||!u.password)
  throw Error('F2-12 database credential invalid');
 const user=decodeURIComponent(u.username);
 if(user!=='roleta_v2_writer.uobxxgzshrmbtjfdolxd')
  throw Error('F2-12 requires dedicated project-scoped writer login');
 if(u.hostname!=='aws-1-sa-east-1.pooler.supabase.com'||u.port!=='5432'||u.pathname!=='/postgres')
  throw Error('F2-12 requires verified project session pooler');
 if(u.searchParams.get('sslmode')!=='verify-full')
  throw Error('F2-12 verified TLS is mandatory');
 return url;
}
function verifiedTlsConfig(env=process.env){
 const ca=env.ROLETA_V2_TLS_CA_PEM;
 if(typeof ca!=='string'||ca.length>16384||!/^-----BEGIN CERTIFICATE-----\r?\n[\s\S]+\r?\n-----END CERTIFICATE-----\s*$/.test(ca))
  throw Error('F2-12 trusted pooler CA PEM missing or invalid');
 return {ca,rejectUnauthorized:true,servername:'aws-1-sa-east-1.pooler.supabase.com'};
}
function getPool({env=process.env,loadPg=()=>require('pg')}={}){
 const connectionString=databaseUrl(env);
 // pg-connection-string replaces explicit ssl options when the URL contains
 // sslmode. Remove only the validated sslmode, retain strict CA + hostname
 // verification in the actual Node TLS socket configuration.
 const uri=new URL(connectionString);
 uri.searchParams.delete('sslmode');
 const ssl=verifiedTlsConfig(env);
 if(!pool){
  const {Pool}=loadPg();
  pool=new Pool({connectionString:uri.toString(),ssl,max:2,
    connectionTimeoutMillis:5000,idleTimeoutMillis:5000,
    statement_timeout:8000,query_timeout:10000,application_name:'roleta-f2-12-v2'});
 }
 return pool;
}
async function appendV2(command,{env=process.env,getPoolFn=getPool}={}){
 if(env.ROLETA_V2_WRITES_ENABLED!=='true')throw Error('F2-12 writes disabled');
 if(!command||typeof command.sql!=='string'||!Array.isArray(command.params)||command.params.length!==9
   ||command.sql!==ALLOWED_APPEND_SQL)
  throw Error('unsupported F2-12 SQL');
 // Validate credential even if pool is injected; never silently use admin.
 databaseUrl(env);
 const response=await getPoolFn({env}).query(command.sql,command.params);
 const id=response?.rows?.[0]?.evidence_id;
 if(!/^\d+$/.test(String(id)))throw Error('invalid F2-12 append result');
 return String(id);
}
module.exports={databaseUrl,verifiedTlsConfig,getPool,appendV2};
