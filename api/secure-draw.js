'use strict';
const crypto=require('node:crypto');
const {Pool}=require('pg');
const core=require('../server/secure-draw-core.cjs');
let pool;
function database(){
 if(!process.env.SORTEADOR_DATABASE_DATABASE_URL)throw Error('Banco do Sorteador Oficial não configurado.');
 if(!pool)pool=new Pool({connectionString:process.env.SORTEADOR_DATABASE_DATABASE_URL,max:3,connectionTimeoutMillis:4000,idleTimeoutMillis:10000,statement_timeout:8000});
 return pool;
}
function key(){const value=process.env.SORTEADOR_ED25519_PRIVATE_KEY; if(!value)throw Error('Chave de assinatura não configurada.');return value.replace(/\\n/g,'\n');}
function respond(res,code,obj){res.status(code).setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.end(JSON.stringify(obj));}
function publicSession(row,events){
 return {id:row.id,mode:row.mode,first:row.first_number,last:row.last_number,total:row.total,
 createdAt:row.created_at,finishedAt:row.finished_at,operatorId:row.operator_id,startReceipt:row.start_receipt,lastHash:row.last_hash,
 draws:events.map(e=>({position:e.position,number:e.number,at:e.occurred_at,receipt:e.receipt}))};
}
async function load(client,id,lock=false){
 const s=await client.query('select * from public.secure_draw_sessions where id=$1'+(lock?' for update':''),[id]);
 if(!s.rowCount)return null;
 const e=await client.query('select position,number,occurred_at,receipt from public.secure_draw_events where session_id=$1 order by position',[id]);
 return publicSession(s.rows[0],e.rows);
}
async function start(client,body,operator,privateKey){
 const requestId=core.requestId(body.requestId),v=core.bounds(body);
 await client.query('begin');
 try{
  const existing=await client.query('select id from public.secure_draw_sessions where request_id=$1',[requestId]);
  if(existing.rowCount){
   const state=await load(client,existing.rows[0].id);
   if(state.operatorId!==operator||state.first!==v.first||state.last!==v.last||state.mode!==v.mode)throw Object.assign(Error('Solicitação reutilizada com outros parâmetros.'),{status:409});
   await client.query('commit');return state;
  }
  const id=crypto.randomUUID(),at=new Date().toISOString();
  const genesis=core.sha256(core.canonical({version:1,id,mode:v.mode,first:v.first,last:v.last,total:v.total,operator,at}));
  const signed=core.receipt({type:'start',version:1,sessionId:id,operatorId:operator,mode:v.mode,first:v.first,last:v.last,total:v.total,at,genesisHash:genesis},privateKey);
  const inserted=await client.query(`insert into public.secure_draw_sessions
   (id,request_id,mode,first_number,last_number,total,operator_id,last_hash,start_receipt)
   values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
   on conflict (request_id) do nothing returning id`,
   [id,requestId,v.mode,v.first,v.last,v.total,operator,genesis,JSON.stringify(signed)]);
  if(!inserted.rowCount){
   const original=await client.query('select id from public.secure_draw_sessions where request_id=$1',[requestId]);
   if(!original.rowCount)throw Error('Conflito de solicitação.');
   const state=await load(client,original.rows[0].id);
   if(state.operatorId!==operator||state.first!==v.first||state.last!==v.last||state.mode!==v.mode)throw Object.assign(Error('Solicitação reutilizada com outros parâmetros.'),{status:409});
   await client.query('commit');return state;
  }
  await client.query('commit');
  return await load(client,id);
 }catch(err){await client.query('rollback');throw err;}
}
async function draw(client,body,operator,privateKey){
 const sessionId=body.sessionId,requestId=core.requestId(body.requestId);
 if(!core.isUuid(sessionId))throw Error('Identificador de sorteio inválido.');
 await client.query('begin');
 try{
  const q=await client.query('select * from public.secure_draw_sessions where id=$1 for update',[sessionId]);
  if(!q.rowCount)throw Object.assign(Error('Sorteio não encontrado.'),{status:404});
  const row=q.rows[0];
  if(row.operator_id!==operator)throw Object.assign(Error('Acesso negado.'),{status:403});
  const used=await client.query('select position,number,receipt from public.secure_draw_events where session_id=$1 order by position',[sessionId]);
  const before=await load(client,sessionId);
  if(!core.verifyLedger(before,core.publicKey(privateKey)))throw Object.assign(Error('Falha na integridade dos registros. Sorteio bloqueado.'),{status:409});
  const duplicate=used.rows.find(e=>e.receipt?.payload?.requestId===requestId);
  if(duplicate){await client.query('commit');return before;}
  if(row.finished_at||used.rowCount>=row.total)throw Object.assign(Error('Sorteio concluído. Crie uma nova sessão para começar novamente.'),{status:409});
  const picked=used.rows.map(e=>e.number);
  const number=core.pick(row.first_number,row.last_number,picked);
  const position=picked.length+1,at=new Date().toISOString();
  const unsigned={type:'draw',version:1,sessionId,requestId,position,number,at,previousHash:row.last_hash};
  const eventHash=core.sha256(core.canonical(unsigned));
  const receipt=core.receipt({...unsigned,eventHash},privateKey);
  await client.query(`insert into public.secure_draw_events
   (session_id,request_id,position,number,occurred_at,prev_hash,event_hash,receipt)
   values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[sessionId,requestId,position,number,at,row.last_hash,eventHash,JSON.stringify(receipt)]);
  await client.query(`update public.secure_draw_sessions set last_hash=$2,
    finished_at=case when $3=total then now() else finished_at end where id=$1`,
    [sessionId,eventHash,position]);
  await client.query('commit');
  return await load(client,sessionId);
 }catch(err){await client.query('rollback');throw err;}
}
module.exports=async function handler(req,res){
 res.setHeader('Allow','GET, POST');res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'Método não permitido.'});
 if(req.method==='POST'&&Number(req.headers['content-length']||0)>4096)return respond(res,413,{error:'Solicitação muito grande.'});
 try{
  const body=req.method==='POST'?req.body:{};
  if(req.method==='POST'&&(!body||typeof body!=='object'||Array.isArray(body)))return respond(res,400,{error:'JSON inválido.'});
  // Verificação pública de um recibo individual, sem credenciais ou acesso ao banco.
  if(req.method==='POST'&&body.action==='verify'){
   const receipt=body.receipt;
   if(!receipt||typeof receipt!=='object'||!receipt.payload||typeof receipt.payload!=='object')return respond(res,400,{error:'Comprovante inválido.'});
   return respond(res,200,{valid:core.verify(receipt.payload,receipt.signature,core.publicKey(key())),algorithm:'Ed25519'});
  }
  if(!process.env.SORTEADOR_DATABASE_DATABASE_URL||!process.env.SORTEADOR_ED25519_PRIVATE_KEY||!process.env.SORTEADOR_OPERATOR_KEYS_JSON)return respond(res,503,{error:'Sorteador Oficial ainda não ativado. Falta configuração segura no servidor.'});
  const operator=core.identifyOperator(req.headers.authorization,process.env.SORTEADOR_OPERATOR_KEYS_JSON);
  if(!operator)return respond(res,401,{error:'Acesso negado.'});
  const client=await database().connect();
  try{
   if(req.method==='GET'){
    if(req.query?.list==='1'){
     const items=await client.query('select id,mode,first_number,last_number,total,created_at,finished_at from public.secure_draw_sessions where operator_id=$1 order by created_at desc limit 100',[operator]);
     return respond(res,200,{sessions:items.rows});
    }
    if(!core.isUuid(req.query?.sessionId))return respond(res,400,{error:'Informe um identificador válido.'});
    const state=await load(client,req.query.sessionId);
    if(!state||state.operatorId!==operator)return respond(res,404,{error:'Sorteio não encontrado.'});
    if(!core.verifyLedger(state,core.publicKey(key())))return respond(res,409,{error:'Falha na verificação de integridade. Operação bloqueada.'});
    return respond(res,200,{session:state});
   }
   if(body.action==='start')return respond(res,200,{session:await start(client,body,operator,key())});
   if(body.action==='draw')return respond(res,200,{session:await draw(client,body,operator,key())});
   return respond(res,400,{error:'Operação não reconhecida.'});
  }finally{client.release();}
 }catch(err){
  // Não retornar erros SQL nem detalhes internos ao navegador.
  const status=err.status||(/inválid|Informe|intervalo|bolinhas/.test(err.message)?400:500);
  return respond(res,status,{error:status===500?'Operação indisponível. Nenhum novo resultado foi confirmado. Consulte o estado antes de tentar novamente.':err.message});
 }
};
