'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {inspectStructuralGate}=require('./ocrspace-shadow-structural-gate.cjs');
const row=(p,n,v)=>({posicao_impressa:p,nome_lido:n,numero_sorteado:v});
test('second-photo-like payload finds 27 drawn, two unassigned and wrong declared 30',()=>{
 const linhas=Array.from({length:27},(_,i)=>row(i+1,'Corretor '+(i+1),String(i+1).padStart(2,'0')));
 linhas.push(row(28,null,null),row(29,'Globz',null),row(30,'Madri',null));
 const result=inspectStructuralGate({quantidade_corretores:30,linhas});
 assert.equal(result.contagem_numeros_sorteados,27);
 assert.deepEqual(result.posicoes_sem_sorteio_com_nome,[29,30]);
 assert.deepEqual(result.posicoes_vazias,[28]);
 assert.deepEqual(result.inconsistencias,['UNASSIGNED_NAMES_REQUIRE_HUMAN_CLASSIFICATION','DECLARED_COUNT_MISMATCH']);
 assert.equal(result.classificacao_sem_sorteio,'INDETERMINADA_ATE_REVISAO_HUMANA');
 assert.equal(result.autorizado_base_estatistica,false);
});
test('complete sequence is structurally valid yet never authorizes printing',()=>{
 const r=inspectStructuralGate({quantidade_corretores:2,linhas:[row(1,'A','02'),row(2,'B','01')]});
 assert.equal(r.integridade_estrutural,'SEM_ALERTAS');
 assert.deepEqual(r.inconsistencias,[]);
 assert.equal(r.autorizado_impressao,false);
});
test('detects duplicated and missing draw numbers without correcting them',()=>{
 const r=inspectStructuralGate({quantidade_corretores:3,linhas:[row(1,'A','01'),row(2,'B','01'),row(3,'C','03')]});
 assert.ok(r.inconsistencias.includes('DUPLICATE_DRAW_NUMBER'));
 assert.ok(r.inconsistencias.includes('DRAW_PERMUTATION_INVALID'));
 assert.deepEqual(r.numeros_ausentes,[2]);
});
test('rejects ambiguous numeric text and duplicate positions',()=>{
 const r=inspectStructuralGate({quantidade_corretores:1,linhas:[row(1,'A','1O')]});
 assert.ok(r.inconsistencias.includes('INVALID_DRAW_NUMBER_FORMAT'));
 assert.throws(()=>inspectStructuralGate({linhas:[row(1,'A','01'),row(1,'B','02')]}),/duplicated/);
});
test('unsorted names cannot be assumed to be STAND BY',()=>{
 const r=inspectStructuralGate({quantidade_corretores:1,linhas:[row(1,'A','01'),row(2,'B',null)]});
 assert.deepEqual(r.posicoes_sem_sorteio_com_nome,[2]);
 assert.equal(r.classificacao_sem_sorteio,'INDETERMINADA_ATE_REVISAO_HUMANA');
});
