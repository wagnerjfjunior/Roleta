'use strict';
// Gate E: staged GitHub PR submission. Never writes to main directly.
// All mutations happen on a new branch, with ONE tree/commit, after read-only validation.
const crypto=require('node:crypto');
const official=require('../data/print-brokers.json');
const {prepare}=require('../statistical/submission.js');
const REPO='wagnerjfjunior/Roleta';
const CSV_HEADER='Fonte,Evento,Data,Período,N,Posições físicas ocupadas,Nº1 físico,Nº1 ordem efetiva,Nº2 físico,Nº2 ordem efetiva,Cortesia físico,Cortesia ordem efetiva,Último físico,Último ordem efetiva,Qualidade,Observação';
function csvCell(v){const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function csvRows(text){
 let rows=[],row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'&&quoted&&text[i+1]==='"'){field+='"';i++;continue;}
  if(c==='"'){quoted=!quoted;continue;}
  if(c===','&&!quoted){row.push(field);field='';continue;}
  if((c==='\r'||c==='\n')&&!quoted){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[];continue;
  }
  field+=c;
 }
 if(quoted)throw Error('malformed CSV');
 if(field||row.length){row.push(field);rows.push(row);}
 const headings=rows.shift();
 if(!headings||!headings.includes('Evento')||!headings.includes('Data')||!headings.includes('Período'))throw Error('invalid canonical CSV');
 return rows.map(r=>Object.fromEntries(headings.map((h,i)=>[h,r[i]??''])));
}
const normalizeName=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function assertOfficial(reviewed,prepared){
 const officialRows=official.brokers||[];
 const byName=new Map(officialRows.map(x=>[normalizeName(x.nome),x]));
 if(prepared.drawn_mapping.length!==reviewed.salao.length)throw Error('invalid roster');
 const seen=new Set();
 for(const row of reviewed.salao){
  const name=normalizeName(row.nome),b=byName.get(name);
  if(!name||!b||seen.has(name))throw Error('unknown or duplicate broker');
  seen.add(name);
  for(const [key,officialKey] of [['creci','creci'],['gerente','gerente'],['diretor','diretor'],['status_creci','status_creci']])
   if(String(row[key]||'').trim()!==String(b[officialKey]||'').trim())throw Error('broker registry mismatch');
 }
 if(prepared.N!==Number(reviewed.evento.tegra_qtd))throw Error('declared count mismatch');
}
function buildCsv(e,actorHash,submittedAt){
 const physicalSorted=[...e.occupied].sort((a,b)=>a-b);
 const effective=n=>physicalSorted.indexOf(n)+1;
 const br=e.event_date.slice(8,10)+'/'+e.event_date.slice(5,7)+'/'+e.event_date.slice(0,4);
 const p=e.period==='manha'?'manha':e.period==='tarde'?'tarde':'integral';
 const sha=crypto.createHash('sha256').update(JSON.stringify(e)).digest('hex');
 const note='Gate E: human-reviewed; submitted_at='+submittedAt+'; actor_hash='+actorHash+'; payload_sha256='+sha+'; original physical positions preserved; pending Git PR approval.';
 const vals=[e.source,e.event_id,br,p,e.N,e.occupied.join(','),e.first,effective(e.first),e.second,effective(e.second),e.courtesy,effective(e.courtesy),e.last,effective(e.last),'A',note];
 return CSV_HEADER+'\n'+vals.map(csvCell).join(',')+'\n';
}
function assertUniqueEvent(manifest,sourceRows,e){
 if(!Array.isArray(manifest.sources)||sourceRows.length!==manifest.sources.length)throw Error('invalid manifest sources');
 const seen=new Map();
 for(let i=0;i<sourceRows.length;i++){
  const rows=sourceRows[i];
  if(rows.length!==manifest.sources[i].events)throw Error('manifest source count mismatch');
  for(const row of rows){
   const id=String(row.Evento||'');
   const period=String(row['Período']||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   const date=String(row.Data||'');
   const k=date+'|'+period;
   if(id===e.event_id||(date===(e.event_date.slice(8,10)+'/'+e.event_date.slice(5,7)+'/'+e.event_date.slice(0,4))&&period==='desconhecido')||k===(e.event_date.slice(8,10)+'/'+e.event_date.slice(5,7)+'/'+e.event_date.slice(0,4))+'|'+e.period)
    throw Object.assign(Error('event already registered; correction requires separate review'),{status:409});
   if(seen.has(id)&&seen.get(id)!==JSON.stringify(row))throw Error('historical collision');
   seen.set(id,JSON.stringify(row));
  }
 }
 if(seen.size!==manifest.canonical_event_count)throw Error('canonical count mismatch');
}
function makeGitHub(token,transport=fetch){
 return async(method,path,body)=>{
  const r=await transport('https://api.github.com/repos/'+REPO+path,{
   method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',
    'User-Agent':'Roleta-Stat-Gate-E'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error('GitHub operation rejected'),{status:r.status===422||r.status===409?409:502});
  return data;
 };
}
async function stageStatisticalSubmission(input,{actorSub,token,transport=fetch,clock=()=>new Date().toISOString()}={}){
 if(typeof token!=='string'||token.length<20)throw Object.assign(Error('GitHub repository credential unavailable'),{status:503});
 if(typeof actorSub!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(actorSub))throw Error('verified actor required');
 const e=prepare(input.reviewed,input.physicalByDraw,{source:input.source,acknowledged:input.acknowledged});
 assertOfficial(input.reviewed,e);
 const gh=makeGitHub(token,transport);
 const main=await gh('GET','/git/ref/heads/main');
 const mainSha=main.object?.sha;
 if(!/^[a-f0-9]{40}$/.test(mainSha||''))throw Error('invalid main SHA');
 const rawManifest=await gh('GET','/contents/data/manifest.json?ref=main');
 const manifest=JSON.parse(Buffer.from(rawManifest.content||'','base64').toString('utf8'));
 const sources=[];
 for(const item of manifest.sources){
  if(!/^\/data\/(?:events\.csv|incoming\/[0-9-]+\.csv)$/.test(item.path))throw Error('untrusted manifest source path');
  const result=await gh('GET','/contents'+item.path+'?ref=main');
  sources.push(csvRows(Buffer.from(result.content||'','base64').toString('utf8')));
 }
 assertUniqueEvent(manifest,sources,e);
 const path='data/incoming/'+e.event_id+'.csv';
 const updated={...manifest,
  logical_dataset_version:'gate-e-'+e.event_id,
  canonical_event_count:manifest.canonical_event_count+1,
  quality_A:manifest.quality_A+1,
  sources:[...manifest.sources,{path:'/'+path,role:'append_only_ledger',events:1}]};
 const commit=await gh('GET','/git/commits/'+mainSha);
 const actorHash=crypto.createHash('sha256').update(actorSub).digest('hex').slice(0,16);
 const submittedAt=clock();
 const tree=await gh('POST','/git/trees',{
  base_tree:commit.tree.sha,
  tree:[{path,mode:'100644',type:'blob',content:buildCsv(e,actorHash,submittedAt)},
   {path:'data/manifest.json',mode:'100644',type:'blob',content:JSON.stringify(updated,null,2)+'\n'}]
 });
 const prepared=await gh('POST','/git/commits',{message:'data(statistics): stage '+e.event_id+' for audit',tree:tree.sha,parents:[mainSha]});
 const branch='stat-intake/'+e.event_id;
 await gh('POST','/git/refs',{ref:'refs/heads/'+branch,sha:prepared.sha});
 const pr=await gh('POST','/pulls',{title:'Data: validar roleta '+e.event_id,head:branch,base:'main',
  body:'Gate E · revisão humana obrigatória antes do merge. Evento: '+e.event_id+'; data original: '+e.event_date+
  '; responsável hash: '+actorHash+'. Confira a fonte, posições físicas originais, números sorteados, N, qualidade e manifest. Não faça merge sem auditoria.'});
 return {status:'pending_review',event_id:e.event_id,pr_number:pr.number,pr_url:pr.html_url};
}
module.exports={csvRows,assertUniqueEvent,buildCsv,stageStatisticalSubmission};
