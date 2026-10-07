#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const readJson=p=>JSON.parse(read(p));
const parseJsonl=p=>read(p).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(JSON.parse).filter(x=>x.record_type!=='LEDGER_INIT');

function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c==='"'&&quoted&&n==='"'){field+='"';i++;continue}
    if(c==='"'){quoted=!quoted;continue}
    if(c===','&&!quoted){row.push(field);field='';continue}
    if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&n==='\n')i++;
      row.push(field);field='';
      if(row.some(v=>v!==''))rows.push(row);
      row=[];continue
    }
    field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row)}
  const headers=rows.shift()||[];
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}

const manifest=readJson('data/manifest.json');
const nominal=parseCSV(read('data/full_draws_reconstructed.csv'));
const recommendations=parseJsonl('data/prospective/recommendations.jsonl');
const executions=parseJsonl('data/prospective/executions.jsonl');
const adjudications=parseJsonl('data/prospective/adjudications.jsonl');

const out={
  generated_from:'canonical versioned data',
  schema:'rlt-current-data-state-v1',
  canonical_dataset:{
    version:manifest.logical_dataset_version,
    logical_events:manifest.canonical_event_count,
    quality_A:manifest.quality_A,
    quality_B:manifest.quality_B,
    sources:(manifest.sources||[]).length
  },
  nominal_ledger:{
    events:new Set(nominal.map(r=>r.event_id).filter(Boolean)).size,
    participant_rows:nominal.length
  },
  prospective:{
    recommendations:recommendations.length,
    weekly_frozen:recommendations.filter(x=>x.strategy==='WEEKLY_FROZEN').length,
    current:recommendations.filter(x=>x.strategy==='CURRENT').length,
    random_shadow:recommendations.filter(x=>x.strategy==='RANDOM_SHADOW').length,
    executions:executions.length,
    adjudications:adjudications.length
  },
  authority:{
    dataset:'data/manifest.json',
    nominal:'data/full_draws_reconstructed.csv',
    prospective_recommendations:'data/prospective/recommendations.jsonl',
    prospective_executions:'data/prospective/executions.jsonl',
    prospective_adjudications:'data/prospective/adjudications.jsonl'
  }
};

const target=path.join(root,'docs/sfjm/CURRENT_DATA_STATE.json');
fs.writeFileSync(target,JSON.stringify(out,null,2)+'\n');
process.stdout.write(JSON.stringify(out,null,2)+'\n');
