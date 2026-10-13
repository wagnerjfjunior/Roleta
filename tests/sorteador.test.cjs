'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const engine=require('../sorteador/engine.js');

test('rejeita quantidades invalidas',()=>{
 for(const n of [0,-1,201,1.5,NaN,Infinity])assert.throws(()=>engine.assertTotal(n));
 assert.equal(engine.assertTotal(1),1);
 assert.equal(engine.assertTotal(200),200);
});
test('todos os numeros aparecem exatamente uma vez',()=>{
 for(const total of [1,2,25,100,200]){
  const draws=[];
  const source={getRandomValues(arr){arr[0]=(draws.length*2654435761)>>>0;return arr;}};
  for(let i=0;i<total;i++){
   const n=engine.next(total,draws,source);
   assert.equal(engine.remaining(total,draws).includes(n),true);
   draws.push({position:i+1,number:n,at:new Date().toISOString()});
  }
  assert.equal(new Set(draws.map(d=>d.number)).size,total);
  assert.deepEqual(draws.map(d=>d.number).sort((a,b)=>a-b),Array.from({length:total},(_,i)=>i+1));
  assert.throws(()=>engine.next(total,draws,source));
 }
});
test('rejeita duplicacoes, lacunas de historico ou valores fora do universo',()=>{
 assert.throws(()=>engine.remaining(3,[{number:2},{number:2}]));
 assert.throws(()=>engine.remaining(3,[{number:4}]));
 assert.throws(()=>engine.remaining(3,[{number:0}]));
});
test('rejeicao de viés quando valor 2^32-1 nao pertence ao dominio',()=>{
 let called=0;
 const source={getRandomValues(arr){arr[0]=called++===0?0xffffffff:1;return arr;}};
 assert.equal(engine.secureIndex(3,source),1);
 assert.equal(called,2);
});
test('navegador sem RNG criptografico nao pode sortear',()=>{
 assert.throws(()=>engine.next(5,[],null));
});
test('seleção uniformemente mapeada em dominio divisivel',()=>{
 for(let i=0;i<100;i++){
  const source={getRandomValues(arr){arr[0]=i;return arr;}};
  assert.equal(engine.secureIndex(5,source),i%5);
 }
});

test('modo do primeiro ao ultimo numero e inclusivo e nao repete',()=>{
 for(const [first,last] of [[1,1],[50,80],[25,224]]){
  const n=last-first+1,draws=[];
  const source={getRandomValues(arr){arr[0]=((draws.length+1)*2654435761)>>>0;return arr;}};
  for(let i=0;i<n;i++){
   const result=engine.nextRange(first,last,draws,source);
   assert.ok(result>=first&&result<=last);
   draws.push({number:result,position:i+1});
  }
  assert.equal(new Set(draws.map(d=>d.number)).size,n);
  assert.deepEqual(draws.map(d=>d.number).sort((a,b)=>a-b),Array.from({length:n},(_,i)=>first+i));
  assert.throws(()=>engine.nextRange(first,last,draws,source));
 }
});
test('modo intervalo bloqueia limites invalidos',()=>{
 for(const [a,b] of [[80,50],[0,50],[1,201],[1.1,10]])assert.throws(()=>engine.assertRange(a,b));
 assert.deepEqual(engine.assertRange(50,80),{first:50,last:80,total:31});
 assert.throws(()=>engine.remainingRange(50,52,[{number:51},{number:51}]));
 assert.throws(()=>engine.remainingRange(50,52,[{number:49}]));
});
