'use strict';
// Explicitly disabled by default. Shadow endpoint never modifies final roulette.
const auth=require('../auth/google');
const {expectFinal,MAX_IMAGE_BYTES}=require('../server/ocr-shadow-link.cjs');
const {readFinal,authorizeFinalOperator}=require('../server/final-roulette-store.cjs');
const {databaseUrl,getPool}=require('../server/prospective-v2-db-transport.cjs');
const crypto=require('node:crypto');
const SQL='SELECT roleta_ocr.enqueue_confirmed_photo_v1($1,$2,$3,$4,$5,$6) AS result';
const TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
function constantEqual(a,b){
 const x=Buffer.from(typeof a==='string'?a:''),y=Buffer.from(typeof b==='string'?b:'');
 return x.length===y.length&&crypto.timingSafeEqual(x,y);
}
async function bytesFromRequest(req){
 if(Buffer.isBuffer(req.body)){if(req.body.length>MAX_IMAGE_BYTES)throw Object.assign(Error('Imagem excessiva'),{status:413});return req.body;}
 let bytes=[],size=0;
 for await (const part of req) {
  const b=Buffer.isBuffer(part)?part:Buffer.from(part);
  size+=b.length;if(size>MAX_IMAGE_BYTES)throw Object.assign(Error('Imagem excessiva'),{status:413});
  bytes.push(b);
 }
 return Buffer.concat(bytes);
}
async function storePhoto({env,bytes,mime,path,fetchFn=fetch}){
 const token=env.ROLETA_OCR_STORAGE_SERVICE_KEY;
 if(!token||!/^https:\/\/uobxxgzshrmbtjfdolxd[.]supabase[.]co$/.test(env.ROLETA_OCR_SUPABASE_URL||''))throw Object.assign(Error('Storage desativado'),{status:503});
 const url=env.ROLETA_OCR_SUPABASE_URL+'/storage/v1/object/roleta-ocr-shadow/'+path;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetchFn(url,{method:'POST',headers:{'Authorization':'Bearer '+token,'apikey':token,'Content-Type':mime,'x-upsert':'false','Cache-Control':'no-store'},body:bytes,signal:controller.signal,redirect:'error'});
  if(response.status===409)return {created:false};
  if(!response.ok)throw Object.assign(Error('Falha no armazenamento privado'),{status:503});
  return {created:true};
 }finally{clearTimeout(timeout);}
}
function createHandler({env=process.env,authenticate=auth,read=readFinal,authorize=authorizeFinalOperator,poolFn=getPool,storage=storePhoto}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Método não permitido.'});}
  if(env.ROLETA_OCR_SHADOW_ENABLED!=='true')return res.status(503).json({error:'Aprendizagem OCR ainda não ativada.'});
  try{
   if(!authenticate.requireSameOrigin(req))return res.status(403).json({error:'Origem não autorizada.'});
   const session=authenticate.session(req);
   if(!session)return res.status(401).json({error:'Entre com Google.'});
   const allowed=String(env.ROLETA_FINAL_OPERATOR_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
   if(!allowed.includes(session.email)||!/^[A-Za-z0-9_-]{1,128}$/.test(session.sub))return res.status(403).json({error:'Operador não autorizado.'});
   if(!constantEqual(req.headers['x-roleta-csrf'],authenticate.csrfForSub(session.sub)))return res.status(403).json({error:'Confirmação de segurança inválida.'});
   const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
   if(!Object.hasOwn(TYPES,mime))return res.status(415).json({error:'Formato não permitido.'});
   if(Number(req.headers['content-length']||0)>MAX_IMAGE_BYTES)return res.status(413).json({error:'Imagem excessiva.'});
   const eventId=String(req.headers['x-roleta-event-id']||'');
   const version=Number(req.headers['x-roleta-final-version']);
   const digest=String(req.headers['x-roleta-final-digest']||'');
   if(!/^[a-f0-9]{64}$/.test(digest)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}-[MTI]$/.test(eventId)||!Number.isSafeInteger(version)||version<1)return res.status(422).json({error:'Evento/versão inválidos.'});
   await authorize(session,{env});
   const records=await read({env});
   const current=records.find(r=>r.event_id===eventId);
   if(!current||current.version!==version||current.digest!==digest)return res.status(409).json({error:'A versão atual confirmada não corresponde à solicitação.'});
   const bytes=await bytesFromRequest(req);
   const verified=expectFinal({eventId,version,operatorSub:session.sub,reviewed:current.payload?.reviewed,image:bytes,mime});
   // Preflight and atomic enqueue independently check the current version.
   // The database function also checks final version authorship.
   const path=eventId+'/'+version+'/'+verified.image_sha256+'.'+TYPES[mime];
   await storage({env,bytes,mime,path});
   databaseUrl(env);
   const saved=await poolFn({env}).query(SQL,[eventId,version,digest,session.sub,verified.image_sha256,path]);
   const result=saved.rows?.[0]?.result;
   if(result?.status!=='queued'||result.event_id!==eventId||result.final_version_id!==String(version))throw Object.assign(Error('Resposta do enfileiramento inválida'),{status:503});
   return res.status(202).json({status:'QUEUED',job_id:result.job_id,event_id:eventId,version});
  }catch(e){
   const status=e.status||(['40001','23505'].includes(e.code)?409:e.code==='42501'?403:503);
   return res.status([403,409,413,415,422,503].includes(status)?status:503).json({error:status===409?'Versão desatualizada ou evidência já vinculada a outro registro.':status===413?'Imagem excede 900 KB.':status===422?'Dados da imagem/folha não conferem.':'Não foi possível enfileirar a leitura paralela.'});
  }
 };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
module.exports.SQL=SQL;
module.exports.storePhoto=storePhoto;
