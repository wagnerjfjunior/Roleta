'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const roster = require('../data/print-brokers.json').brokers;
const {reconcileOcrSpace, fromOcrSpaceResponse, parseOcrSpaceText} = require('./ocrspace-shadow-reconciler.cjs');

const sample = [
 'EMPREENDIMENTO', 'ELO DUO/GARDEN/NOVA VIVERE', '***Corretor***',
 '1 ARNOW','2 Prina','3 Aurora','4 MAGALHAES','5 mohara','6 Gloszy',
 '7 Valeria','8 LOTUS','9 MADRI','10 Belesario','11 Leonora',
 '12 Antonia','13 KATIO','14 Lutila','15 DANIEL','16 aline,',
 '17 Sabrina','18 WAGNER','19 BENGALTO','20 Sanches','21 LOBO',
 '22','23 Ashley','24','','DATA - 06/10/2026','PERÍODO - MANHA',
 '***Gerente***','N°','03 CAZARIN','20 cazarin'
].join('\n');

test('same photographed sample has 15 exact salon names, 6 suggestions, and Ashley exact', () => {
 const result = reconcileOcrSpace({parsedText: sample, brokers: roster});
 assert.equal(result.linhas.length, 24);
 assert.equal(result.resumo.exatos, 16); // 15 salon + Ashley in row 23
 assert.equal(result.resumo.revisao, 6);
 assert.equal(result.resumo.bloqueados, 2); // rows 22 and 24 blank
 assert.equal(result.linhas[5].nome_ocr, 'Gloszy');
 assert.equal(result.linhas[5].status, 'REVISAO_HUMANA');
 assert.equal(result.linhas[5].confirmado, null);
 assert.ok(result.linhas[5].candidatos.some(x => x.nome === 'Globz' && x.gerente === 'Cazarim'));
 assert.equal(result.linhas[18].confirmado, null); // BENGALTO must not be silently resolved
 assert.equal(result.linhas[22].confirmado.nome, 'Ashley');
 assert.equal(result.autorizado_impressao, false);
 assert.equal(result.autorizado_base_estatistica, false);
 assert.ok(!result.linhas.some(line => Object.hasOwn(line, 'numero_sorteado')));
});
test('corrupted and oversized input fails closed', () => {
 assert.throws(() => reconcileOcrSpace({parsedText: 'x'.repeat(100001), brokers: roster}));
 assert.throws(() => fromOcrSpaceResponse({IsErroredOnProcessing: true}, roster));
 assert.throws(() => fromOcrSpaceResponse({OCRExitCode:1, IsErroredOnProcessing:false, ParsedResults:[{FileParseExitCode:0,ParsedText:sample}]},roster));
});
test('out-of-order positions are not silently reordered', () => {
 const p = parseOcrSpaceText('***Corretor***\n1 Arnon\n3 Aurora\n2 Prina\nDATA - 2026');
 assert.deepEqual(p.rows.map(x => x.posicao_fisica), [1,3]);
 assert.ok(p.issues.includes('POSITION_GAP'));
 assert.ok(p.issues.includes('INVALID_OR_OUT_OF_ORDER_POSITION'));
});
test('roster duplicate identities are not silently approved', () => {
 const two = [{nome:'Globz',gerente:'Cazarim'}, {nome:'GLOBZ',gerente:'Other'}];
 const r = reconcileOcrSpace({parsedText:'***Corretor***\n1 Globz\nDATA - 06/10/2026',brokers:two});
 assert.equal(r.linhas[0].status,'AMBIGUO');
});
