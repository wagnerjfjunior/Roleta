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
 assert.ok(result.resumo.revisao >= 4); // fuzzy recall is measured, not assumed
 assert.ok(result.resumo.bloqueados >= 2); // blank rows, and possibly low-confidence OCR
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
 assert.ok(p.issues.includes('OCR_COLUMN_ALIGNMENT_UNVERIFIED'));
});
test('roster duplicate identities are not silently approved', () => {
 const two = [{nome:'Globz',gerente:'Cazarim'}, {nome:'GLOBZ',gerente:'Other'}];
 const r = reconcileOcrSpace({parsedText:'***Corretor***\n1 Globz\nDATA - 06/10/2026',brokers:two});
 assert.equal(r.linhas[0].status,'AMBIGUO');
});

test('second OCR sample: metadata before name rows, 40 printed positions, and repeated director', () => {
 const rows = [
  '1 ARNON','2 DANIELS Geo','3 VALEMA','4 BEHESIT O','5 Aurora',
  '6 CABALLY','7 Vain','8 Sobrina','9 MAGALHAES','10 Antonior',
  '11 Prima','12 Leonora','13 KAT','14 WAGNER','15 VICENTE',
  '16 PAOLA','17 Luteha','18 Monarc','19 Lotus','20 Sanches',
  '21 Amora','22 Luma','23 030 Ansola','24','25 Alive',
  '26 Gelasw','27 Laura','28','29','30 MADE',
  ...Array.from({length:10},(_,i)=>String(i+31))
 ];
 const ocr = [
  'EMPREENDIMENTO','ELO DUO/GARDEN/NOVA VIVERE','***Corretor***',
  'N°','DATA-06/20/2026','PERÍODO - DAVIDE',
  ...rows, '04 CAZARIN','06','24','CORRETORES HELBOR:',
  '17','SORTEIO DA EMPRESA','TEGRA 1-2 HELBOR 3',
  '***Gerente***','***Diretor***',
  ...Array.from({length:170},()=>'Renan')
 ].join('\n');
 const parsed=parseOcrSpaceText(ocr);
 assert.equal(parsed.rows.length,40);
 assert.equal(parsed.rows[0].nome_ocr,'ARNON');
 assert.equal(parsed.rows[29].nome_ocr,'MADE');
 assert.equal(parsed.rows[39].nome_ocr,'');
 assert.equal(parsed.diretor_ocr_nao_vinculado,'Renan');
 assert.equal(parsed.diretor_ocorrencias,170);
 assert.ok(parsed.issues.includes('OCR_COLUMN_ALIGNMENT_UNVERIFIED'));
 const result=reconcileOcrSpace({parsedText:ocr,brokers:roster});
 assert.equal(result.linhas[0].confirmado.nome,'Arnon');
 assert.equal(result.linhas[0].diretor_oficial,'Renan');
 assert.equal(result.linhas[0].diretor_ocr,null);
 assert.equal(result.evidencia_diretor.alinhamento_por_linha,false);
 assert.equal(result.autorizado_impressao,false);
});
test('cropped director is roster information, not OCR evidence', () => {
 const result=reconcileOcrSpace({parsedText:'***Corretor***\n1 Arnon\n2 Prina\n***Gerente***\nRenan',brokers:roster});
 assert.equal(result.linhas[0].diretor_oficial,'Renan');
 assert.equal(result.linhas[0].diretor_ocr,null);
 assert.equal(result.evidencia_diretor.diretor_ocr_nao_vinculado,null);
});
