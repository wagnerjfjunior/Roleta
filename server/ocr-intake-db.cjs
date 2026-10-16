'use strict';
// Separate credential: NEVER use postgres, service_role, or existing roleta_v2_writer.
let pool;
function getIntakePool(env=process.env){
 if(env.ROLETA_INTAKE_ENABLED!=='true')throw Error('intake disabled');
 const value=env.ROLETA_INTAKE_DATABASE_URL;
 const ca=env.ROLETA_INTAKE_TLS_CA_PEM;
 if(!value||!ca)throw Error('intake DB credentials unavailable');
 const u=new URL(value);
 if(!['postgres:','postgresql:'].includes(u.protocol)||
   decodeURIComponent(u.username)!=='roleta_intake_api.uobxxgzshrmbtjfdolxd'||
   u.hostname!=='aws-1-sa-east-1.pooler.supabase.com'||
   u.port!=='5432'||u.pathname!=='/postgres'||
   u.searchParams.get('sslmode')!=='verify-full')throw Error('unapproved intake database target');
 if(!/^-----BEGIN CERTIFICATE-----\r?\n[\s\S]+-----END CERTIFICATE-----\s*$/.test(ca))throw Error('intake CA missing');
 u.searchParams.delete('sslmode');
 if(!pool){const {Pool}=require('pg');pool=new Pool({connectionString:u.toString(),ssl:{ca,rejectUnauthorized:true,servername:u.hostname},max:2,
   connectionTimeoutMillis:5000,statement_timeout:8000,query_timeout:10000,application_name:'roleta-intake'});}
 return pool;
}
module.exports={getIntakePool};
