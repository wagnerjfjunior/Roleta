(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RoletaOcrLearning=api;
})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const empty=()=>({version:1,events:[]});
const key=p=>[p?.evento?.empreendimento,p?.evento?.data,p?.evento?.periodo].map(norm).join('|');
function clean(input){
 if(input?.version!==1||!Array.isArray(input.events))return empty();
 const events=input.events.slice(-200).filter(e=>typeof e.id==='string'&&e.id.length<=160&&Array.isArray(e.pairs)&&e.pairs.length<=100)
 .map(e=>({id:e.id,pairs:e.pairs.filter(p=>typeof p.raw==='string'&&p.raw.length<=80&&typeof p.name==='string'&&p.name.length<=80)}));
 return {version:1,events};
}
function record(state,source,reviewed,directory){
 const result=clean(state),id=key(reviewed);
 if(source?.source!=='ocr-space'||!Array.isArray(source.linhas)||reviewed?.status!=='VALIDADO'||!reviewed?.evento?.data)return result;
 const brokers=directory?.brokers||directory||[];
 const original=new Map(),final=new Map();
 for(const r of source.linhas){const p=Number(r.posicao_impressa);if(Number.isInteger(p)&&p>0)original.set(p,[...(original.get(p)||[]),r]);}
 for(const r of reviewed.salao||[]){const p=Number(r.physical_position);if(Number.isInteger(p)&&p>0)final.set(p,[...(final.get(p)||[]),r]);}
 const pairs=[];
 for(const [p,rows] of original){
  const confirmed=final.get(p);
  if(rows.length!==1||confirmed?.length!==1)continue;
  const raw=String(rows[0].nome_lido||'').trim(),name=confirmed[0].nome;
  // Physical mapping changes are rejected by the UI before this call. Never
  // learn from missing positions, exact valid identities, or excluded rows.
  if(raw.length<3||raw.length>80||!/[A-Za-zÀ-ÿ]/.test(raw)||norm(raw)===norm(name)||brokers.some(b=>norm(b.nome)===norm(raw)))continue;
  if(brokers.filter(b=>norm(b.nome)===norm(name)).length!==1)continue;
  pairs.push({raw,name});
 }
 // A sheet is one observation. Reconfirming or correcting replaces its support.
 result.events=result.events.filter(e=>e.id!==id);
 result.events.push({id,pairs});result.events=result.events.slice(-200);
 return result;
}
function suggestions(state,directory){
 const brokers=directory?.brokers||directory||[],votes=new Map(),out=Object.create(null);
 for(const e of clean(state).events){
  const perEvent=new Map();
  for(const p of e.pairs){const k=norm(p.raw);if(!perEvent.has(k))perEvent.set(k,new Set());perEvent.get(k).add(norm(p.name));}
  for(const [k,names] of perEvent){if(!votes.has(k))votes.set(k,{names:new Set(),events:new Set()});const v=votes.get(k);names.forEach(n=>v.names.add(n));v.events.add(e.id);}
 }
 for(const [raw,v] of votes){
  if(v.names.size!==1||v.events.size<2||brokers.some(b=>norm(b.nome)===raw))continue;
  const matches=brokers.filter(b=>norm(b.nome)===[...v.names][0]);
  if(matches.length===1)out[raw]=matches[0].nome;
 }
 return out;
}
function load(storage,account){try{return clean(JSON.parse(storage.getItem('roleta-ocr-learning-v1:'+norm(account))));}catch{return empty();}}
function save(storage,account,state){try{storage.setItem('roleta-ocr-learning-v1:'+norm(account),JSON.stringify(clean(state)));return true;}catch{return false;}}
return {empty,record,suggestions,load,save,key};
});
