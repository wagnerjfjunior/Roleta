'use strict';
// Gate D: historical manifest intake vs print/share. No real DB or network.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {mergeManifestEvents}=require('../../domain/canonical-dataset.js');
function csv(text){
  const rows=[],cells=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c==='"'&&quoted&&n==='"'){field+='"';i++;continue;}
    if(c==='"'){quoted=!quoted;continue;}
    if(c===','&&!quoted){row.push(field);field='';continue;}
    if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&n==='\n')i++;
      row.push(field);field='';
      if(row.some(v=>v!==''))rows.push(row);
      row=[];continue;
    }
    field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row);}
  const header=rows.shift();
  return rows.map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]??''])));
}
const normalized=v=>({
  source:v['Fonte'],id:v['Evento'],date:v['Data'],
  period:String(v['Período']).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
  N:Number(v.N),occupied:(v['Posições físicas ocupadas']||'').split(',').map(Number).filter(Number.isFinite),
  first:Number(v['Nº1 físico']),second:Number(v['Nº2 físico']),
  courtesy:Number(v['Cortesia físico']),last:Number(v['Último físico']),
  quality:v['Qualidade'],notes:v['Observação']||''
});
const root=path.join(__dirname,'../..');
function fixture(){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/manifest.json'),'utf8'));
  const chunks=manifest.sources.map(s=>csv(fs.readFileSync(path.join(root,s.path.slice(1)),'utf8')).map(normalized).filter(e=>e.N>0));
  return {manifest,chunks};
}
test('live canonical manifest matches every CSV source and counts without mutation',()=>{
 const {manifest,chunks}=fixture();
 const result=mergeManifestEvents(chunks,manifest);
 assert.equal(result.length,manifest.canonical_event_count);
 assert.equal(result.filter(e=>e.quality==='A').length,manifest.quality_A);
 assert.equal(result.filter(e=>e.quality==='B').length,manifest.quality_B);
});
test('an exact repeated event is idempotent, not added twice',()=>{
 const {manifest,chunks}=fixture();
 const first=chunks[0][0];
 const m={...manifest,sources:[...manifest.sources,{path:'/data/incoming/repeated.csv',events:1}]};
 const result=mergeManifestEvents([...chunks,[{...first,occupied:[...first.occupied]}]],m);
 assert.equal(result.length,manifest.canonical_event_count);
 assert.equal(result.find(e=>e.id===first.id).date,first.date);
});
test('a conflicting replay is blocked, not silently overwritten',()=>{
 const {manifest,chunks}=fixture();
 const original=chunks[0][0];
 const m={...manifest,sources:[...manifest.sources,{path:'/data/incoming/conflict.csv',events:1}]};
 assert.throws(()=>mergeManifestEvents([...chunks,[{...original,first:original.first===1?2:1}]],m),/Conflito de versões/);
});
test('tampered manifest or invalid occupied lines fails closed',()=>{
 const {manifest,chunks}=fixture();
 assert.throws(()=>mergeManifestEvents(chunks,{...manifest,canonical_event_count:manifest.canonical_event_count+1}),/Total/);
 assert.throws(()=>mergeManifestEvents(chunks,{...manifest,quality_A:manifest.quality_A+1}),/qualidade A/);
 const broken=chunks.map(x=>[...x]);broken[0][0]={...broken[0][0],occupied:[1,1,...broken[0][0].occupied.slice(2)]};
 assert.throws(()=>mergeManifestEvents(broken,manifest),/Posições físicas inválidas/);
});
test('D+1 upload does not reinterpret historical event date as upload date',()=>{
 const {manifest,chunks}=fixture();
 const original=chunks[chunks.length-1][0];
 const result=mergeManifestEvents(chunks,manifest);
 assert.equal(result.find(e=>e.id===original.id).date,original.date);
 assert.notEqual(original.date,'11/10/2026'); // test date is not substituted for original.
});
test('operational print/share path does not register historical or prospective writes',()=>{
 const intake=fs.readFileSync(path.join(root,'roulette-intake.js'),'utf8');
 assert.match(intake,/savePdf\.addEventListener\('click',saveReadyPdf\)/);
 assert.match(intake,/sharePdf\.addEventListener\('click',shareReadyPhoto\)/);
 assert.doesNotMatch(intake,/\/api\/prospective-v2-append|\/api\/statistical-append/);
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/RoletaCanonicalDataset\.mergeManifestEvents\(chunks,manifest\)/);
});
