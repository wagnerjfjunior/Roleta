'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createServer}=require('../scripts/local-pdf-server.cjs');
const b=JSON.parse(fs.readFileSync('data/print-brokers.json','utf8')).brokers[0];
const p={status:'VALIDADO',evento:{empreendimento:'CAMINHOS DA LAPA',data:'09/10/2026',dia_semana:'SEXTA-FEIRA',periodo:'TARDE',tegra_qtd:1,helbor_qtd:0,company_draw:{mode:'tegra_share',tegra_positions:[1,2],helbor_positions:[3]}},salao:[{nome:b.nome,creci:b.creci,gerente:b.gerente,diretor:b.diretor,status_creci:b.status_creci,ordem_final:1}],standby:[],online:[],pendencias:[]};
(async()=>{
 const server=createServer();
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/pdf';
  let response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  assert.equal(response.status,403,'requests without explicitly permitted SFJM origin blocked');
  response=await fetch(url,{method:'POST',headers:{'Origin':'http://evil.example','Content-Type':'application/json'},body:JSON.stringify(p)});
  assert.equal(response.status,403,'foreign browser origins blocked');
  response=await fetch(url,{method:'POST',headers:{'Origin':'http://localhost:8082','Content-Type':'application/json'},body:JSON.stringify(p)});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('access-control-allow-origin'),'http://localhost:8082');
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  console.log('PASS: SFJM loopback-only PDF API works without Google, and blocks other origins');
 }finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
})().catch(e=>{console.error(e);process.exitCode=1;});
