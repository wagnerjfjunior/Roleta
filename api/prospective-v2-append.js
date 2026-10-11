'use strict';
// F2-12 private per-person prospective evidence endpoint, NOT operational print.
// Feature gate OFF by default. Vercel-only runtime, no browser DB credentials.
const {prepareV2FromHttp}=require('../server/prospective-v2-google-http.cjs');
const {loadAuthorizedPersonIdsFromEnv}=require('../server/prospective-v2-person-acl-env.cjs');
const {assertPreDraw}=require('../server/prospective-v2-event-gate.cjs');
const {appendV2}=require('../server/prospective-v2-db-transport.cjs');
function handler({prepare=prepareV2FromHttp,loadAcl=loadAuthorizedPersonIdsFromEnv,
 assertEvent=assertPreDraw,append=appendV2,env=process.env}={}){
 return async function(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
  if(env.ROLETA_V2_WRITES_ENABLED!=='true')return res.status(503).json({error:'Registro prospectivo indisponível.'});
  try{
   const cmd=await prepare(req,{loadAuthorizedPersonIds:loadAcl});
   assertEvent(cmd);
   const evidenceId=await append(cmd,{env});
   return res.status(201).json({status:'REGISTERED',evidence_id:evidenceId});
  }catch(error){
   // No SQL, credentials, actor identifiers or payloads in public responses.
   if(/authentication|required|session|Google/i.test(error.message))return res.status(401).json({error:'Autenticação necessária.'});
   if(/origin|CSRF|authorized|ACL|person not authorized/i.test(error.message))return res.status(403).json({error:'Operação não autorizada.'});
   if(/already closed|target roulette|target event cutoff|generation must be server-current|invalid target event date/i.test(error.message))
    return res.status(422).json({error:'Previsão fora da janela anterior ao sorteio.'});
   return res.status(503).json({error:'Não foi possível registrar a evidência.'});
  }
 };
}
module.exports=handler();
module.exports.createHandler=handler;
