'use strict';
// New async submit endpoint. Feature flag OFF until Make callback is installed.
const crypto=require('node:crypto'),auth=require('../auth/google');
const {getIntakePool}=require('../server/ocr-intake-db.cjs');
const MAX=900000;
async function bytesOf(req){
 if(Buffer.isBuffer(req.body))return req.body;
 if(req.body!==undefined)throw Object.assign(Error('raw image required'),{status:415});
 let size=0;const chunks=[];
 for await(const b of req){size+=b.length;if(size>MAX)throw Object.assign(Error('oversized'),{status:413});chunks.push(b);}
 return Buffer.concat(chunks);
}
function createHandler({env=process.env,authenticate=auth,db=getIntakePool,dispatch=fetch}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(env.ROLETA_INTAKE_ENABLED!=='true')return res.status(503).json({error:'Disabled'});
  try{
   const s=authenticate.session(req);
   const allowed=String(env.ROLETA_FINAL_OPERATOR_EMAILS||'').split(',').map(x=>x.trim().toLowerCase());
   if(!s||!allowed.includes(s.email))return res.status(403).json({error:'Unauthorized'});
   if(!authenticate.requireSameOrigin(req))return res.status(403).json({error:'Origin rejected'});
   const expected=Buffer.from(authenticate.csrfForSub(s.sub));
   const supplied=typeof req.headers['x-roleta-csrf']==='string'?Buffer.from(req.headers['x-roleta-csrf']):Buffer.alloc(0);
   if(expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied))return res.status(403).json({error:'CSRF rejected'});
   const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
   if(!['image/jpeg','image/png','image/webp'].includes(mime))return res.status(415).json({error:'Invalid MIME'});
   const bytes=await bytesOf(req);
   if(!bytes.length||bytes.length>MAX)return res.status(413).json({error:'Invalid image size'});
   const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
   const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
   if(!((mime==='image/jpeg'&&jpeg)||(mime==='image/png'&&png)||(mime==='image/webp'&&webp)))return res.status(415).json({error:'Image signature mismatch'});
   const digest=crypto.createHash('sha256').update(bytes).digest('hex');
   const pool=db(env);
   const created=await pool.query('SELECT roleta_intake.create_job($1,$2) AS id',[s.sub,digest]);
   const id=created.rows?.[0]?.id;
   if(typeof id!=='string')throw Error('No job id');
   const started=await pool.query('SELECT roleta_intake.start_job($1,$2) AS ok',[id,s.sub]);
   if(started.rows?.[0]?.ok!==true){
    return res.status(202).json({job_id:id,status:'EXISTING',poll_url:'/api/ocr-job-status?job_id='+id});
   }
   const target=new URL(env.ROLETA_INTAKE_MAKE_WEBHOOK_URL||'');
   if(target.protocol!=='https:'||!target.hostname.endsWith('.make.com'))throw Error('Invalid Make endpoint');
   const form=new FormData();
   form.append('file',new Blob([bytes],{type:mime}),'roleta.'+(mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'));
   form.append('job_id',id);
   // Dispatch ACK is not a persisted Gemini result. Make must callback separately.
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),12000);
   try{
    const upstream=await dispatch(target.toString(),{method:'POST',body:form,signal:controller.signal,redirect:'error'});
    if(!upstream.ok)throw Error('Make dispatch rejected');
   }finally{clearTimeout(timeout);}
   return res.status(202).json({job_id:id,status:'PROCESSING',poll_url:'/api/ocr-job-status?job_id='+id});
  }catch(e){return res.status(e.status===413?413:e.status===415?415:503).json({error:'OCR submission unavailable'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
