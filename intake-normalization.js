(function(root,factory){
 const dependency=typeof module==='object'&&module.exports?require('./reconciliation/identity.js'):root.RoletaIdentityReconciliation;
 const api=factory(dependency);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RoletaIntakeNormalization=api;
})(typeof globalThis==='object'?globalThis:this,function(identity){
'use strict';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function dateInfo(value){
 const text=String(value??'').trim();
 let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text),year,month,day;
 if(m){year=+m[1];month=+m[2];day=+m[3];}
 else {m=/^(\d{2})\/(\d{2})\/(\d{4}|\d{2})$/.exec(text);if(!m)return null;day=+m[1];month=+m[2];year=m[3].length===2?2000+(+m[3]):+m[3];}
 if(year<2000||year>2099)return null;
 const date=new Date(Date.UTC(year,month-1,day,12));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
 const dd=String(day).padStart(2,'0'),mm=String(month).padStart(2,'0');
 return {data:dd+'/'+mm+'/'+year,iso:year+'-'+mm+'-'+dd,dia_semana:['DOMINGO','SEGUNDA-FEIRA','TERÇA-FEIRA','QUARTA-FEIRA','QUINTA-FEIRA','SEXTA-FEIRA','SÁBADO'][date.getUTCDay()]};
}
function resolveDraftName(observed,brokers,{aliases={},learnedAliases={},manager=''}={}){
 const key=norm(observed),result=(candidates,method)=>({broker:candidates.length===1?candidates[0]:null,method:candidates.length===1?method:null});
 if(!key)return result([],null);
 let candidates=brokers.filter(b=>norm(b.nome)===key);
 if(candidates.length)return result(candidates,'NOME_EXATO');
 const targets=Object.entries(aliases).filter(([alias])=>norm(alias)===key).map(([,target])=>norm(target));
 if(targets.length){if(new Set(targets).size!==1)return result([],null);return result(brokers.filter(b=>norm(b.nome)===targets[0]),'ALIAS_CONFIRMADO');}
 const learned=Object.entries(learnedAliases).filter(([alias])=>norm(alias)===key).map(([,target])=>norm(target));
 if(learned.length){if(new Set(learned).size!==1)return result([],null);return result(brokers.filter(b=>norm(b.nome)===learned[0]),'SUGESTAO_APRENDIDA');}
 if(key.length>=3){
   candidates=brokers.filter(b=>norm(b.nome).startsWith(key));
   if(candidates.length===1)return result(candidates,'PREFIXO_UNICO');
   if(candidates.length>1){
     const team=norm(manager);
     return team.length>=3?result(candidates.filter(b=>norm(b.gerente).startsWith(team)),'PREFIXO_GERENTE_UNICO'):result([],null);
   }
 }
 // Draft-only spelling repair: one edit in a long single-word name, a unique
 // nearest identity, and no competitor within two edits. Scores are not probabilities.
 if(!identity||!/^[A-Z]{6,40}$/.test(key))return result([],null);
 const ranked=brokers.map(b=>({broker:b,distance:identity.distance(key,b.nome)})).sort((a,b)=>a.distance-b.distance);
 const best=ranked[0];
 if(!best||best.distance!==1||norm(best.broker.nome).length<6||ranked[1]?.distance<=2)return result([],null);
 const team=norm(manager);
 if(team.length>=3&&!norm(best.broker.gerente).startsWith(team))return result([],null);
 return result([best.broker],'GRAFIA_PROXIMA_UNICA');
}
return {dateInfo,resolveDraftName};
});
