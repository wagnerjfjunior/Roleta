'use strict';
// F2-12: authenticated read-only connectivity test; NEVER enables prospective writes.
const crypto=require('node:crypto');
const auth=require('../auth/google');
const {getPool,databaseUrl}=require('../server/prospective-v2-db-transport.cjs');
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
  }catch{
   // Never return DSN, password, SQL text, user information or database errors.
   return res.status(503).json({status:'DATABASE_CONNECTION_UNAVAILABLE'});
  }
 };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
