'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
function parseCsv(source){
 const records=[];let fields=[],value='',inside=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(c==='"'){if(inside&&source[i+1]==='"'){value+='"';i++}else inside=!inside}
  else if(c===','&&!inside){fields.push(value);value=''}
  else if((c==='\n'||c==='\r')&&!inside){
   if(c==='\r'&&source[i+1]==='\n')i++;
   fields.push(value);value='';
   if(fields.some(Boolean))records.push(fields);
   fields=[];
  }else value+=c;
 }
 assert.equal(inside,false,'Unclosed CSV quote');
 if(value||fields.length){fields.push(value);records.push(fields)}
 const header=records.shift();
 return records.map((cells,index)=>{
  assert.equal(cells.length,header.length,'CSV field count on row '+(index+2));
  return Object.fromEntries(header.map((key,j)=>[key,cells[j]]));
 });
}
test('canonical ledger: verify every manifest source, unique event and structural integrity',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/manifest.json'),'utf8'));
 const ids=new Set();let total=0,A=0,B=0;
 for(const entry of manifest.sources){
  const relative=entry.path.startsWith('/')?entry.path.slice(1):entry.path;
  const rows=parseCsv(fs.readFileSync(path.join(root,relative),'utf8').replace(/^\uFEFF/,''));
  assert.equal(rows.length,entry.events,'Source rows: '+entry.path);
  for(const row of rows){
   const id=(row.Evento||'').trim();
   assert.ok(id,'Missing event ID in '+entry.path);
   assert.ok(!ids.has(id),'Duplicate event ID '+id);
   ids.add(id);
   const N=Number(row.N);
   assert.ok(Number.isInteger(N)&&N>=4,'Invalid N: '+id);
   const occupied=(row['Posições físicas ocupadas']||'').split(',').map(x=>Number(x.trim()));
   assert.equal(occupied.length,N,'Occupied count: '+id);
   assert.ok(occupied.every(n=>Number.isInteger(n)&&n>0),'Invalid occupied position: '+id);
   assert.equal(new Set(occupied).size,N,'Duplicate occupied position: '+id);
   const allowed=new Set(occupied);
   for(const field of ['Nº1 físico','Nº2 físico','Cortesia físico','Último físico']){
    const raw=(row[field]||'').trim();
    if(raw)assert.ok(allowed.has(Number(raw)),'Outcome not occupied: '+id+' '+field);
   }
   if(row.Qualidade==='A')A++;
   else if(row.Qualidade==='B')B++;
   else assert.fail('Unknown quality '+id+': '+row.Qualidade);
   total++;
  }
 }
 assert.equal(total,manifest.canonical_event_count);
 assert.equal(A,manifest.quality_A);
 assert.equal(B,manifest.quality_B);
});
