'use strict';
// Separate from PDF and F2-12. Saving means staging a GitHub PR, not
// publishing canonical statistics. Fails closed until credentials provisioned.
const crypto=require('node:crypto');
const auth=require('../auth/google');
const {stageStatisticalSubmission}=require('../server/statistical-github-stage.cjs');
function createHandler({env=process.env,authenticate=auth,stage=stageStatisticalSubmission}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
  if(env.ROLETA_STAT_WRITES_ENABLED!=='true'||!env.ROLETA_STAT_GITHUB_TOKEN)
   return res.status(503).json({error:'Inclusão estatística indisponível: aguardando habilitação auditada.'});
  if(!authenticate.requireSameOrigin(req))return res.status(403).json({error:'Origem não autorizada.'});
  let session;try{session=authenticate.session(req);}catch{}
  if(!session)return res.status(401).json({error:'Entre com Google para submeter a roleta.'});
  const allowedSubs=String(env.ROLETA_STAT_ALLOWED_SUBS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!allowedSubs.includes(session.sub))return res.status(403).json({error:'Operador não autorizado a incluir estatísticas.'});
  const provided=req.headers?.['x-roleta-csrf'];
  const expected=Buffer.from(authenticate.csrfForSub(session.sub));
  const supplied=typeof provided==='string'?Buffer.from(provided):Buffer.alloc(0);
  if(expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied))
   return res.status(403).json({error:'Confirmação de segurança inválida.'});
  try{
   if(Number(req.headers?.['content-length']||0)>150000)return res.status(413).json({error:'Arquivo excede limite.'});
   if(String(req.headers?.['content-type']||'').split(';')[0].trim().toLowerCase()!=='application/json')
    return res.status(415).json({error:'JSON obrigatório.'});
   const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(Buffer.byteLength(JSON.stringify(input),'utf8')>150000)return res.status(413).json({error:'Arquivo excede limite.'});
   if(!input||Array.isArray(input)||typeof input!=='object'||!input.acknowledged||
      typeof input.source!=='string'||!Array.isArray(input.physicalByDraw))
    return res.status(422).json({error:'Conferência física e fonte oficial obrigatórias.'});
   const result=await stage(input,{actorSub:session.sub,token:env.ROLETA_STAT_GITHUB_TOKEN});
   return res.status(202).json(result);
  }catch(e){
   const code=e.status===409?409:e.status===503?503:e.status===502?502:e instanceof SyntaxError?422:422;
   // Never expose upstream provider errors, actor subject or raw payload.
   return res.status(code).json({error:code===409?'Roleta já registrada ou em revisão. Correções exigem processo versionado.':code===503?'Integração de armazenamento indisponível.':code===502?'Falha temporária na integração de armazenamento.':'Não foi possível preparar a revisão. Confira os dados e tente novamente.'});
  }
 };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
