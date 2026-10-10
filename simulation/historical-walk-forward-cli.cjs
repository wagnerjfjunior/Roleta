'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {evaluate}=require('./historical-walk-forward.cjs');
const root=path.resolve(__dirname,'..');
function csv(text){
 const rows=[];let cells=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}
  else if(c===','&&!quoted){cells.push(field);field=''}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;cells.push(field);field='';if(cells.some(Boolean))rows.push(cells);cells=[]}
  else field+=c;
 }
 if(field||cells.length){cells.push(field);rows.push(cells)}
 const headers=rows.shift()||[];
 return rows.map(row=>Object.fromEntries(headers.map((key,i)=>[key,row[i]??''])));
}
function load(){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/manifest.json'),'utf8'));
 const events=[];
 for(const source of manifest.sources){
  const file=path.join(root,source.path.replace(/^\//,''));
  for(const row of csv(fs.readFileSync(file,'utf8'))){
   const occupied=row['Posições físicas ocupadas'].split(',').map(Number);
   events.push({id:row['Evento'],date:row['Data'],period:row['Período'],N:Number(row.N),occupied,first:Number(row['Nº1 físico']),last:Number(row['Último físico']),quality:row['Qualidade']});
  }
 }
 if(events.length!==manifest.canonical_event_count)throw new Error('Manifest event count mismatch');
 const hash=crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex');
 return {events,manifest,hash};
}
if(require.main===module){
 const {events,manifest,hash}=load();
 const report=evaluate(events);
 const summary={schema:report.schema,mode:report.mode,dataset_version:manifest.logical_dataset_version,input_sha256:hash,total_input:report.total_input,structural_eligible:report.structural_eligible,excluded:report.excluded,warmup:report.warmup,summary:report.summary,limitations:report.assumption};
 process.stdout.write(JSON.stringify(summary,null,2)+'\n');
}
module.exports={csv,load};
