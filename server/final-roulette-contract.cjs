'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {prepare}=require('../statistical/submission.js');
const official=require('../data/print-brokers.json');
const {csvRows}=require('./statistical-github-stage.cjs');
const clean=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function stable(v){
 if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
 if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
 return JSON.stringify(v);
}
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
function fail(message,status=422){throw Object.assign(Error(message),{status});}
function prepareFinal(input,{actorSub,now=new Date(),checkBaseline=true}={}){
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(actorSub||''))fail('Operador inválido.',403);
 if(input?.acknowledged!==true||input?.reviewed?.status!=='VALIDADO')fail('Conferência obrigatória.');
 const p=input.reviewed;
 if(p.pendencias?.length)fail('Existem pendências.');
 const e=prepare(p,input.physicalByDraw,{source:input.source,acknowledged:true});
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 if(e.event_date>today)fail('Resultado futuro não permitido.');
 const directory=new Map();
 for(const b of official.brokers){const k=clean(b.nome);if(directory.has(k))directory.set(k,null);else directory.set(k,b);}
 const used=new Set(),groups={};
 for(const key of ['salao','standby','online']){
  const rows=p[key]??[];
  if(!Array.isArray(rows)||rows.length>200)fail('Grupo inválido.');
  groups[key]=rows.map(r=>{
   const name=clean(r?.nome),b=directory.get(name);
   if(!b||used.has(name))fail('Corretor desconhecido, ambíguo ou duplicado.');
   used.add(name);
   const row={};
   for(const field of ['nome','creci','gerente','diretor','status_creci']){
    if(String(r[field]||'').trim()!==String(b[field]||'').trim())fail('Cadastro divergente.');
    row[field]=String(b[field]||'').trim();
   }
   if(key==='salao')row.ordem_final=Number(r.ordem_final);
   return row;
  });
 }
 if(Number(p.evento.tegra_qtd)!==e.N)fail('Contagem SALÃO divergente.');
 const hb=Number(p.evento.helbor_qtd);
 if(!Number.isSafeInteger(hb)||hb<0||hb>200)fail('Quantidade Helbor inválida.');
 const d=p.evento.company_draw;
 if(!d||!['tegra_share','helbor_share','none'].includes(d.mode))fail('Sorteio de empresa ausente.');
 const tg=d.tegra_positions,h=d.helbor_positions;
 if(!Array.isArray(tg)||!Array.isArray(h)||[...tg,...h].some(x=>!Number.isInteger(x)||x<1||x>3)||new Set([...tg,...h]).size!==tg.length+h.length||
 (d.mode==='none'?(tg.length!==1||h.length!==1):(tg.length+h.length!==3||tg.length!==(d.mode==='tegra_share'?2:1))))fail('Sorteio de empresa inválido.');
 if(checkBaseline){
  const root=path.join(__dirname,'..'),manifest=require('../data/manifest.json');
  const date=p.evento.data;
  for(const source of manifest.sources){
   if(!/^\/data\/(events\.csv|incoming\/[\w-]+\.csv)$/.test(source.path))fail('Manifesto inválido.',503);
   const rows=csvRows(fs.readFileSync(path.join(root,source.path.slice(1)),'utf8'));
   if(rows.some(r=>r.Evento===e.event_id||(r.Data===date&&(clean(r['Período'])===e.period||clean(r['Período'])==='desconhecido'))))fail('Evento já pertence ao histórico preservado.',409);
  }
 }
 const payload={schema:'rlt-final-roulette-v1',event:e,reviewed:{status:'VALIDADO',evento:{empreendimento:'CAMINHOS DA LAPA',data:p.evento.data,periodo:p.evento.periodo,dia_semana:String(p.evento.dia_semana||''),tegra_qtd:e.N,helbor_qtd:hb,company_draw:{mode:d.mode,tegra_positions:[...tg].sort(),helbor_positions:[...h].sort()}},...groups},registry_sha256:sha(stable(official))};
 const text=stable(payload),digest=sha(text);
 const expected=input.expectedVersion??0;
 if(!Number.isSafeInteger(expected)||expected<0)fail('Versão inválida.');
 const reason=String(input.reason||'').trim();
 if(reason.length>1000||(reason.length>0&&reason.length<15))fail('Explique a correção com pelo menos 15 caracteres.');
 return {eventId:e.event_id,text,digest,actorSub,expectedVersion:expected,reason};
}
module.exports={prepareFinal,stable,sha};
