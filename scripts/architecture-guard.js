const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const rules=[
  {file:'app.js',maxLines:80,forbidden:['parseCSV','rank(','eligible(','chance(','brokers-official','full_draws_reconstructed','weekend-policy','presence-current-week','broker-stats-v3']},
  {file:'ui/dashboard-renderers.js',maxLines:180,forbidden:['parseCSV','brokers-official','full_draws_reconstructed','manifest.json','weekend-policy.json','presence-current-week.json']},
  {file:'ui/workspace.js',maxLines:220,forbidden:['parseCSV','brokers-official','full_draws_reconstructed','manifest.json','weekend-policy.json','presence-current-week.json','broker-stats-v3']},
  {file:'services/dashboard-service.js',maxLines:80,forbidden:['manifest.json','brokers-official','full_draws_reconstructed','weekend-policy.json','presence-current-week.json','broker-stats-v3','transcriptions/']}
];

let failed=false;
for(const rule of rules){
  const file=path.join(root,rule.file);
  const text=fs.readFileSync(file,'utf8');
  const lines=text.split(/\r?\n/).length;
  if(lines>rule.maxLines){console.error(rule.file+': '+lines+' lines exceeds '+rule.maxLines);failed=true}
  for(const token of rule.forbidden){
    if(text.includes(token)){console.error(rule.file+': forbidden business/data token '+token);failed=true}
  }
}
for(const file of ['core/csv.js','core/events.js','core/brokers.js','core/weekend.js']){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  if(/\bdocument\b|querySelector|innerHTML|createElement/.test(text)){console.error(file+': domain module references DOM');failed=true}
}
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(/<script[^>]+src="\/core\//.test(index)){console.error('index.html: core domain modules must not execute in browser');failed=true}
const service=fs.readFileSync(path.join(root,'services/dashboard-service.js'),'utf8');
if(!service.includes('/data/dashboard-view.json')){console.error('dashboard service must consume dashboard-view DTO');failed=true}

if(failed)process.exit(1);
console.log('Architecture guard PASS');
