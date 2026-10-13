/* Módulo puro: sem rede, sem Math.random, sem reposição. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RoletaSorteadorEngine=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const MAX=200;
 function assertTotal(total){
  if(!Number.isSafeInteger(total)||total<1||total>MAX)throw new RangeError('Informe uma quantidade entre 1 e '+MAX+'.');
  return total;
 }
 function secureIndex(length, cryptoSource){
  if(!Number.isSafeInteger(length)||length<1||length>4294967296)throw new RangeError('Quantidade inválida.');
  if(!cryptoSource||typeof cryptoSource.getRandomValues!=='function')throw new Error('Este navegador não disponibiliza um gerador criptográfico seguro.');
  // Rejection sampling: 2^32 mod length não introduz viés de módulo.
  const domain=4294967296;
  const limit=Math.floor(domain/length)*length;
  const values=new Uint32Array(1);
  let candidate;
  do{cryptoSource.getRandomValues(values);candidate=values[0];}while(candidate>=limit);
  return candidate%length;
 }
 function remaining(total,draws){
  assertTotal(total);
  if(!Array.isArray(draws)||draws.length>total)throw new Error('Histórico inválido.');
  const picked=new Set();
  for(const entry of draws){
   const number=Number(entry.number);
   if(!Number.isSafeInteger(number)||number<1||number>total||picked.has(number))throw new Error('Histórico inconsistente.');
   picked.add(number);
  }
  return Array.from({length:total},(_,i)=>i+1).filter(n=>!picked.has(n));
 }
 function next(total,draws,cryptoSource){
  const pool=remaining(total,draws);
  if(pool.length===0)throw new Error('Todas as bolinhas já foram sorteadas.');
  return pool[secureIndex(pool.length,cryptoSource)];
 }
 function assertRange(first,last){
  if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first<1||last<first||last>999999)throw new RangeError('Informe o primeiro e o último número (a partir de 1).');
  if(last-first+1>MAX)throw new RangeError('O intervalo pode ter até '+MAX+' números.');
  return {first,last,total:last-first+1};
 }
 function remainingRange(first,last,draws){
  const {total}=assertRange(first,last);
  if(!Array.isArray(draws)||draws.length>total)throw new Error('Histórico inválido.');
  const picked=new Set();
  for(const entry of draws){
   const n=Number(entry.number);
   if(!Number.isSafeInteger(n)||n<first||n>last||picked.has(n))throw new Error('Histórico inconsistente.');
   picked.add(n);
  }
  return Array.from({length:total},(_,i)=>first+i).filter(n=>!picked.has(n));
 }
 function nextRange(first,last,draws,cryptoSource){
  const pool=remainingRange(first,last,draws);
  if(!pool.length)throw new Error('Todas as bolinhas já foram sorteadas.');
  return pool[secureIndex(pool.length,cryptoSource)];
 }
 return Object.freeze({MAX,assertTotal,assertRange,secureIndex,remaining,remainingRange,next,nextRange});
});
