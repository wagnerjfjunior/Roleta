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
 return Object.freeze({MAX,assertTotal,secureIndex,remaining,next});
});
