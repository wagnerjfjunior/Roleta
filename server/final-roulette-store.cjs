'use strict';
const {databaseUrl,getPool}=require('./prospective-v2-db-transport.cjs');
const WRITE='SELECT roleta_audit.save_final_roulette_v1($1,$2,$3,$4,$5,$6) AS result';
const READ='SELECT roleta_audit.read_final_roulettes_v1() AS result';
async function saveFinal(command,{env=process.env,poolFn=getPool}={}){
 if(env.ROLETA_FINAL_WRITES_ENABLED!=='true')throw Object.assign(Error('Gravação desativada.'),{status:503});
 databaseUrl(env);
 const r=await poolFn({env}).query(WRITE,[command.eventId,command.text,command.digest,command.actorSub,command.expectedVersion,command.reason]);
 const result=r.rows?.[0]?.result;
 if(!result||!['saved','replayed'].includes(result.status)||!Number.isSafeInteger(result.version)||result.version<1||result.event_id!==command.eventId)throw Error('Invalid final roulette response');
 return result;
}
async function readFinal({env=process.env,poolFn=getPool}={}){
 if(env.ROLETA_FINAL_READS_ENABLED!=='true')throw Object.assign(Error('Leitura desativada.'),{status:503});
 databaseUrl(env);
 const r=await poolFn({env}).query(READ);
 const result=r.rows?.[0]?.result;
 if(!Array.isArray(result)||result.length>5000)throw Error('Invalid final ledger');
 return result;
}
module.exports={saveFinal,readFinal,WRITE,READ};
