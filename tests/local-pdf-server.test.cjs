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
  // Force HTTP chunks to split inside UTF-8 characters (MANHÃ and accented weekdays).
  const http=require('node:http');
  const utf8=Buffer.from(JSON.stringify(p),'utf8');
  const marker=Buffer.from('Ã','utf8');
  const at=utf8.indexOf(marker);
  assert.ok(at>0,'test payload includes a multibyte UTF-8 character');
  const parts=[utf8.subarray(0,at+1),utf8.subarray(at+1)];
  const rawPdf=await new Promise((resolve,reject)=>{
   const chunks=[];
   const request=http.request(url,{method:'POST',headers:{Origin:'http://localhost:8082','Content-Type':'application/json'}},response=>{
    response.on('data',chunk=>chunks.push(chunk));
    response.on('end',()=>resolve({status:response.statusCode,data:Buffer.concat(chunks)}));
   });
   request.on('error',reject);
   request.write(parts[0]);setImmediate(()=>{request.end(parts[1]);});
  });
  assert.equal(rawPdf.status,200,'split UTF-8 transport chunks still generate a valid PDF');
  assert.equal(rawPdf.data.subarray(0,5).toString(),'%PDF-');
  console.log('PASS: SFJM loopback-only PDF API works without Google, and blocks other origins');
 }finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
})().catch(e=>{console.error(e);process.exitCode=1;});
