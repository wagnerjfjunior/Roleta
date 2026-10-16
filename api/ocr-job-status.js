'use strict';
const auth=require('../auth/google');
const {getIntakePool}=require('../server/ocr-intake-db.cjs');
const {assertJobId}=require('../server/ocr-async-contract.cjs');
function createHandler({env=process.env,authenticate=auth,db=getIntakePool}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(env.ROLETA_INTAKE_ENABLED!=='true')return res.status(503).json({error:'Disabled'});
  try{
   const session=authenticate.session(req);
   const emails=String(env.ROLETA_FINAL_OPERATOR_EMAILS||'').split(',').map(x=>x.trim().toLowerCase());
   if(!session||!emails.includes(String(session.email).toLowerCase()))return res.status(403).json({error:'Not authorized'});
   const id=new URL(req.url,'https://roleta.invalid').searchParams.get('job_id');
   assertJobId(id);
   const r=await db(env).query('SELECT roleta_intake.read_job($1,$2) AS job',[id,session.sub]);
   if(!r.rows?.[0]?.job)return res.status(404).json({error:'Job not found'});
   return res.status(200).json(r.rows[0].job);
  }catch(e){return res.status(503).json({error:'Unable to retrieve job'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
