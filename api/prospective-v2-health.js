'use strict';
// F2-12: authenticated read-only connectivity test; NEVER enables prospective writes.
const crypto=require('node:crypto');
const auth=require('../auth/google');
const {getPool,databaseUrl}=require('../server/prospective-v2-db-transport.cjs');
function diagnosticCode(error){
 const code=String(error?.code||'');
 const message=String(error?.message||'');
 if(['28P01','28000'].includes(code)||/password authentication failed|no pg_hba\.conf entry/i.test(message))
  return 'DATABASE_AUTH_REJECTED';
 if(/^CERT_|^ERR_TLS_|^UNABLE_TO_VERIFY|^DEPTH_ZERO_SELF_SIGNED_CERT/.test(code)
    ||/certificate verify failed|self.signed certificate|certificate has expired|hostname.*certificate/i.test(message))
  return 'DATABASE_TLS_REJECTED';
 if(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ENETUNREACH','EHOSTUNREACH'].includes(code))
  return 'DATABASE_NETWORK_UNREACHABLE';
 if(['ETIMEDOUT','ETIMEOUT'].includes(code)||/Connection terminated due to connection timeout/i.test(message))
  return 'DATABASE_TIMEOUT';
 if(/F2-12 database credential|F2-12 requires|verified TLS is mandatory/i.test(message))
  return 'DATABASE_CONFIGURATION_INVALID';
 return 'DATABASE_CONNECTION_UNAVAILABLE';
}
function createHandler({authenticate=auth,transport={getPool,databaseUrl}}={}){
 return async function(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({status:'METHOD_REJECTED'});
  let session;
  try{
   if(!authenticate.requireSameOrigin(req))return res.status(403).json({status:'ORIGIN_REJECTED'});
   session=authenticate.session(req);
   if(!session)return res.status(401).json({status:'LOGIN_REQUIRED'});
   const given=req.headers?.['x-roleta-csrf'],expected=authenticate.csrfForSub(session.sub);
   if(typeof given!=='string'||typeof expected!=='string')return res.status(403).json({status:'CSRF_REJECTED'});
   const x=Buffer.from(given),y=Buffer.from(expected);
   if(x.length!==y.length||!crypto.timingSafeEqual(x,y))
    return res.status(403).json({status:'CSRF_REJECTED'});
   transport.databaseUrl();
   const db=transport.getPool();
   const result=await db.query(`SELECT current_user = 'roleta_v2_writer' AS identity_ok,
     has_function_privilege(current_user,
       'roleta_audit.append_authenticated_person_evidence_v2(text,text,text,text,text,text,text,text,jsonb)','EXECUTE') AS execute_ok,
     NOT has_table_privilege(current_user,'roleta_audit.prospective_evidence','INSERT') AS direct_insert_denied,
     NOT has_table_privilege(current_user,'roleta_audit.prospective_evidence','SELECT') AS direct_select_denied`);
   const row=result.rows?.[0];
   if(row?.identity_ok===true&&row.execute_ok===true&&row.direct_insert_denied===true&&row.direct_select_denied===true)
    return res.status(200).json({status:'CONNECTED_RESTRICTED'});
   return res.status(503).json({status:'DATABASE_PERMISSIONS_REJECTED'});
  }catch(error){
   // Return only coarse allowlisted diagnostics to authenticated operators.
   // Never return DSN, password, SQL text, user information or raw DB errors.
   return res.status(503).json({status:diagnosticCode(error)});
  }
 };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;

module.exports.diagnosticCode=diagnosticCode;
