'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {REFERENCE,validatePartialReference}=require('./ocrspace-shadow-human-reference.cjs');
function example(){
 const linhas=Array.from({length:30},(_,i)=>({posicao_impressa:i+1,nome_lido:'Outro',numero_sorteado:i<27?String(i+1).padStart(2,'0'):null}));
 for(const record of REFERENCE.participantes){
   const row=linhas[record.posicao_fisica-1];row.nome_lido=record.nome;row.numero_sorteado=record.numero_sorteado;
 }
 linhas[27].nome_lido=null;
 // preserve a proper permutation after overriding four draw numbers
 const fixed=new Set(REFERENCE.participantes.filter(x=>x.classe==='SALAO').map(x=>Number(x.numero_sorteado)));
 const leftover=Array.from({length:27},(_,i)=>i+1).filter(x=>!fixed.has(x));
 let j=0;
 for(const row of linhas.slice(0,27)){
   if(!REFERENCE.participantes.some(x=>x.classe==='SALAO'&&x.posicao_fisica===row.posicao_impressa))row.numero_sorteado=String(leftover[j++]).padStart(2,'0');
 }
 return {quantidade_corretores:30,linhas};
}
test('reference verifies six human-confirmed entries and flags Gemini count 30 vs 27',()=>{
 const r=validatePartialReference(example());
 assert.equal(r.verificacoes.length,6);
 assert.ok(r.verificacoes.every(x=>x.nome_confere&&x.numero_confere));
 assert.ok(r.verificacao_vazio.every(x=>x.sem_nome&&x.sem_numero));
 assert.equal(r.quantidade_com_numero,27);
 assert.equal(r.contagem_gemini_confere,false);
 assert.equal(r.permutacao_estrutural_valida,true);
 assert.equal(r.referencia_parcial,true);
 assert.equal(r.autorizado_impressao,false);
 assert.equal(r.autorizado_base_estatistica,false);
});
test('standby number is never accepted as drawn; missing names flagged',()=>{
 const data=example();data.linhas[28].numero_sorteado='28';data.linhas[5].nome_lido='Outra';
 const r=validatePartialReference(data);
 assert.equal(r.verificacoes.find(x=>x.posicao_fisica===29).numero_confere,false);
 assert.equal(r.verificacoes.find(x=>x.posicao_fisica===6).nome_confere,false);
 assert.equal(r.permutacao_estrutural_valida,false);
});
test('duplicate physical positions are rejected',()=>{
 const data=example();data.linhas[1].posicao_impressa=1;
 assert.throws(()=>validatePartialReference(data),/duplicate/);
});
