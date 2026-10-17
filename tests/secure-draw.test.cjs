'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const core=require('../server/secure-draw-core.cjs');
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const secret=privateKey.export({type:'pkcs8',format:'pem'});
const publicPem=publicKey.export({type:'spki',format:'pem'});
test('modo por corretores e faixa validam limites rigorosos',()=>{
 assert.deepEqual(core.bounds({mode:'count',total:25}),{mode:'count',first:1,last:25,total:25});
 assert.deepEqual(core.bounds({mode:'range',first:50,last:80}),{mode:'range',first:50,last:80,total:31});
 for(const v of [{mode:'count',total:0},{mode:'count',total:201},{mode:'range',first:2,last:1},{mode:'range',first:1,last:201},{mode:'count',total:25.5},{mode:'range',first:1,last:1000000},{mode:'other',total:5}])assert.throws(()=>core.bounds(v));
});
test('seleção do servidor impede repetição e saída fora da faixa',()=>{
 const numbers=[];
 for(let i=0;i<200;i++){const n=core.pick(50,249,numbers);assert.ok(n>=50&&n<=249);numbers.push(n);}
 assert.equal(new Set(numbers).size,200);
 assert.throws(()=>core.pick(50,249,numbers));
 assert.throws(()=>core.pick(50,52,[50,50]));
 assert.throws(()=>core.pick(50,52,[0]));
});
test('assina recibos e detecta qualquer adulteração',()=>{
 const payload={type:'draw',sessionId:crypto.randomUUID(),number:17,position:1};
 const signed=core.receipt(payload,secret);
 assert.equal(core.verify(signed.payload,signed.signature,publicPem),true);
 assert.equal(core.verify({...payload,number:18},signed.signature,publicPem),false);
 assert.equal(core.verify(payload,'broken',publicPem),false);
 assert.equal(core.publicKey(secret),publicPem);
});
test('cada operador exige token único e suficiente',()=>{
 const t1=crypto.randomBytes(32).toString('hex'),t2=crypto.randomBytes(32).toString('hex');
 const map=JSON.stringify({wagner:t1,brenda:t2});
 assert.equal(core.identifyOperator('Bearer '+t1,map),'wagner');
 assert.equal(core.identifyOperator('Bearer '+t2,map),'brenda');
 assert.equal(core.identifyOperator('Bearer '+t1.slice(1),map),null);
 assert.equal(core.identifyOperator('',map),null);
 assert.equal(core.identifyOperator('Bearer '+t1,'invalid'),null);
});
test('encadeamento de recibos detecta mudança, quebra de ordem e repetição',()=>{
 const sessionId=crypto.randomUUID(),operatorId='wagner',at=new Date().toISOString();
 const genesisHash=core.sha256('genesis');
 const startReceipt=core.receipt({type:'start',sessionId,operatorId,mode:'range',first:50,last:52,total:3,genesisHash,at},secret);
 const draws=[];let lastHash=genesisHash;
 for(const [i,number] of [52,50,51].entries()){
  const p={type:'draw',version:1,sessionId,requestId:crypto.randomUUID(),position:i+1,number,at,previousHash:lastHash};
  const eventHash=core.sha256(core.canonical(p));
  const receipt=core.receipt({...p,eventHash},secret);
  draws.push({position:i+1,number,receipt});lastHash=eventHash;
 }
 const s={id:sessionId,operatorId,mode:'range',first:50,last:52,total:3,startReceipt,lastHash,draws};
 assert.equal(core.verifyLedger(s,publicPem),true);
 assert.equal(core.verifyLedger({...s,draws:[...draws].reverse()},publicPem),false);
 assert.equal(core.verifyLedger({...s,lastHash:'a'.repeat(64)},publicPem),false);
 assert.equal(core.verifyLedger({...s,draws:[{...draws[0],number:51},...draws.slice(1)]},publicPem),false);
});
