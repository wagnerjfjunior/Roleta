'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../server/ocr-async-contract.cjs');
test('states are monotonic',()=>{assert.equal(c.assertTransition('QUEUED','PROCESSING'),'PROCESSING');assert.equal(c.assertTransition('PROCESSING','READY_FOR_REVIEW'),'READY_FOR_REVIEW');assert.throws(()=>c.assertTransition('READY_FOR_REVIEW','PROCESSING'));assert.throws(()=>c.assertTransition('FAILED','READY_FOR_REVIEW'));});
test('only owner reads job',()=>{assert.equal(c.assertOwner({operator_sub:'a'},{sub:'a'}),true);assert.throws(()=>c.assertOwner({operator_sub:'a'},{sub:'b'}));});
test('validates OCR rows and refuses malformed',()=>{assert.equal(c.normalizeResult({linhas:[{posicao_impressa:1,nome_lido:'Paola',numero_sorteado:3}]}).linhas.length,1);assert.throws(()=>c.normalizeResult({linhas:[]}));assert.throws(()=>c.normalizeResult({linhas:[{posicao_impressa:101,nome_lido:'x',numero_sorteado:1}]}));});
test('digest deterministic, oversized images rejected',()=>{assert.equal(c.imageDigest(Buffer.from('abc')).length,64);assert.equal(c.imageDigest(Buffer.from('abc')),c.imageDigest(Buffer.from('abc')));assert.throws(()=>c.imageDigest(Buffer.alloc(900001)));});
test('job id format',()=>{assert.equal(c.assertJobId('550e8400-e29b-41d4-a716-446655440000'),'550e8400-e29b-41d4-a716-446655440000');assert.throws(()=>c.assertJobId('../unsafe'));});
