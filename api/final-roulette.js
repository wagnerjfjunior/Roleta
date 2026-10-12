'use strict';
const crypto=require('node:crypto'),auth=require('../auth/google');
const {prepareFinal}=require('../server/final-roulette-contract.cjs');
const {saveFinal,readFinal}=require('../server/final-roulette-store.cjs');
function createHandler({env=process.env,authenticate=auth,save=saveFinal,read=readFinal,prepare=prepareFinal}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método não permitido.'});
  const enabled=env[req.method==='GET'?'ROLETA_FINAL_READS_ENABLED':'ROLETA_FINAL_WRITES_ENABLED']==='true';
  if(!enabled)return res.status(503).json({error:'Integração da folha final desativada.'});
  try{
   const s=authenticate.session(req);
   if(!s)return res.status(401).json({error:'Entre com Google.'});
   const allowed=String(env.ROLETA_STAT_ALLOWED_SUBS||'').split(',').map(x=>x.trim()).filter(x=>/^[A-Za-z0-9_-]{1,128}$/.test(x));
   if(!allowed.includes(s.sub))return res.status(403).json({error:'Operador não autorizado.'});
   if(req.method==='GET')return res.status(200).json({schema:'rlt-final-ledger-v1',records:await read({env})});
   if(!authenticate.requireSameOrigin(req))return res.status(403).json({error:'Origem não autorizada.'});
   const given=req.headers?.['x-roleta-csrf'],expected=authenticate.csrfForSub(s.sub);
   if(typeof given!=='string'||typeof expected!=='string'||Buffer.byteLength(given)!==Buffer.byteLength(expected)||!crypto.timingSafeEqual(Buffer.from(given),Buffer.from(expected)))return res.status(403).json({error:'Confirmação de segurança inválida.'});
   if(String(req.headers?.['content-type']||'').split(';')[0].trim()!=='application/json')return res.status(415).json({error:'JSON obrigatório.'});
   if(Number(req.headers?.['content-length']||0)>150000)return res.status(413).json({error:'Arquivo excede limite.'});
   const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!input||Array.isArray(input)||Buffer.byteLength(JSON.stringify(input))>150000)return res.status(413).json({error:'Conteúdo inválido ou excede limite.'});
   const command=prepare(input,{actorSub:s.sub});
   return res.status(200).json(await save(command,{env}));
  }catch(e){
   const conflict=e.status===409||e.code==='23505'||e.code==='40001';
   const code=conflict?409:[403,413,422,503].includes(e.status)?e.status:e instanceof SyntaxError||e.code==='22023'?422:503;
   return res.status(code).json({error:conflict?'Evento existente ou versão desatualizada. Carregue o registro antes de corrigir.':code===422?'Confira a folha, o cadastro, a data e o motivo da correção.':'Não foi possível concluir. Nenhuma gravação foi confirmada.'});
  }
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
