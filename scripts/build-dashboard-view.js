const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const CSV=require('../core/csv');
const Events=require('../core/events');
const Brokers=require('../core/brokers');
const Weekend=require('../core/weekend');

const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const exists=p=>fs.existsSync(path.join(root,p));

const manifest=json('data/manifest.json');
const groups=(manifest.sources||[]).map(s=>CSV.parse(read(String(s.path).replace(/^\//,''))));
const events=Events.mergeEventRows(groups);

const exceptions={
  '04/10/2026':{mode:'dual',periods:['manha','tarde'],reason:'Eleições Gerais 2026 · 1º turno'},
  '25/10/2026':{mode:'dual',periods:['manha','tarde'],reason:'Eleições Gerais 2026 · eventual 2º turno'}
};

const transDir=path.join(root,'data','transcriptions');
const transRows=fs.existsSync(transDir)
  ? fs.readdirSync(transDir).filter(x=>x.endsWith('.csv')).sort().flatMap(x=>CSV.parse(fs.readFileSync(path.join(transDir,x),'utf8')))
  : [];

const blockedEvents=new Set();
if(exists('data/identity-reconciliation.jsonl')){
  for(const line of read('data/identity-reconciliation.jsonl').split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){
    const row=JSON.parse(line);
    if(row.event_id&&row.canonical_for_statistics===false)blockedEvents.add(row.event_id);
  }
}

const aliases=json('data/broker-name-aliases.json').aliases||{};
const family=[
  {display_name:'Wagner',ledger_name:'Wagner'},
  {display_name:'Brenda',ledger_name:'Sabrina'},
  {display_name:'Laura',ledger_name:'Laura'},
  {display_name:'Helena',ledger_name:'Helena'}
];

const brokers=Brokers.derive(
  CSV.parse(read('data/full_draws_reconstructed.csv')),
  transRows,
  CSV.parse(read('data/brokers-official.csv')),
  aliases,
  events,
  family,
  {blockedEvents:[...blockedEvents]}
);

const model={
  version:'DASHBOARD-MODEL-V1',
  source_version:manifest.logical_dataset_version,
  identity_policy:'IDENTITY-V1.0.0',
  blocked_identity_events:[...blockedEvents].sort(),
  events,
  eventModel:Events.build(events,exceptions),
  brokers,
  weekend:Weekend.resolve(json('data/weekend-policy.json'),json('data/presence-current-week.json')),
  modelLab:json('data/model-lab.json')
};

delete model.brokers.rows;
const out=JSON.stringify(model,null,2)+'\n';
const target=path.join(root,'data','dashboard-view.json');
fs.writeFileSync(target,out,'utf8');
console.log('dashboard-view generated:',model.eventModel.dataset.count,'events,',model.brokers.validated_events,'nominal events');
