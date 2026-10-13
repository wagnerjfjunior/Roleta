'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const {convertOcrSpace}=require('../server/ocr-space-draft.cjs');
const payload=(raw,lines)=>({IsErroredOnProcessing:false,ParsedResults:[{FileParseExitCode:1,ParsedText:raw,TextOverlay:{Lines:lines||[]}}]});
const word=(t,left,top,width=40,height=20)=>({WordText:t,Left:left,Top:top,Width:width,Height:height});
test('production header-only overlay recovers explicit broker positions without assigning an incomplete ball column',()=>{
 const d=convertOcrSpace(require('./fixtures/ocr-space-header-only-overlay.json'));
 assert.equal(d.metodo_leitura,'column-text');assert.equal(d.linhas.length,31);
 assert.deepEqual(d.linhas[0],[{posicao_impressa:1,nome_lido:'Corretor 1',numero_sorteado:null,gerente:null,diretor:null,confianca:'baixa'}][0]);
 assert.equal(d.linhas[26].posicao_impressa,27);assert.equal(d.linhas[26].nome_lido,null);
 assert.equal(d.linhas[28].nome_lido,'Corretor 29');
 assert.ok(d.linhas.every(l=>l.numero_sorteado===null&&!/(Gerente|Diretor)/.test(l.nome_lido||'')));
});
test('column text rejects mixed or duplicate rows rather than creating people from fragments',()=>{
 for(const column of ['1 A\n1 B\n3 C','1 A\ntexto solto\n3 C','1 A\n3 B\n2 C']){
  const d=convertOcrSpace(payload('***Corretor***\n'+column+'\nN°\n01\n***Gerente***\nRENAN'));
  assert.equal(d.metodo_leitura,'manual');assert.equal(d.linhas[0].nome_lido,null);
 }
});
test('production geometry: overlapping heading keeps rows and excludes management; missing index is not guessed',()=>{
 const d=convertOcrSpace(require('./fixtures/ocr-space-overlapping-header.json'));
 assert.equal(d.metodo_leitura,'overlay');
 assert.deepEqual(d.linhas.map(l=>[l.posicao_impressa,l.nome_lido,l.numero_sorteado]),[[1,'Corretor A','04'],[2,'Corretor B','03'],[null,'Corretor C','06'],[4,'Corretor D','24']]);
 assert.ok(d.linhas.every(l=>!/(Gerente|Diretor)/.test(l.nome_lido)));
});
test('unstructured OCR does not invent physical rows, drawn numbers or header',()=>{
 const draft=convertOcrSpace(payload('EMPREENDIMENTO\nDATA 13-10-26\nCORRETORES HELBOR 11\n1\nARNON\n04\nPAOLA\n01'));
 assert.equal(draft.metodo_leitura,'manual');assert.equal(draft.linhas.length,1);assert.equal(draft.linhas[0].nome_lido,null);assert.ok(draft.linhas.every(l=>l.posicao_impressa===null&&l.numero_sorteado===null&&l.confianca==='baixa'));assert.equal(draft.data,null);assert.equal(draft.quantidade_corretores,null);assert.equal(draft.source,'ocr-space');
});
test('explicit table cells keep physical row and ball distinct; duplicates never repaired',()=>{
 const draft=convertOcrSpace(payload('1 | Arnon | 10 | Team\n16 | Paola | 01 | Team\n9 | Wagner | 01 | Team'));
 assert.equal(draft.linhas[0].posicao_impressa,1);assert.equal(draft.linhas[0].numero_sorteado,'10');assert.equal(draft.linhas[1].posicao_impressa,16);assert.equal(draft.linhas[1].numero_sorteado,'01');assert.equal(draft.linhas[2].numero_sorteado,'01');
});
test('geometry associates columns and rows, never uses manager as broker',()=>{
 const draft=convertOcrSpace(payload('table',[
 {Words:[word('CORRETOR',150,100,120),word('Nº',440,100,20),word('GERENTE',620,100,100)]},
 {Words:[word('1',20,150,10),word('Arnon',130,150,70),word('10',440,150,20),word('Anselmo',620,150,90)]},
 {Words:[word('16',20,200,15),word('Paola',130,200,60),word('01',440,200,20),word('Wislane',620,200,90)]},
 {Words:[word('17',20,250,15)]}
 ]));
 assert.equal(draft.metodo_leitura,'overlay');assert.equal(draft.linhas.length,2);assert.equal(draft.linhas[1].posicao_impressa,16);assert.equal(draft.linhas[1].nome_lido,'Paola');assert.equal(draft.linhas[1].numero_sorteado,'01');assert.equal(draft.linhas[1].gerente,null);
});
test('ambiguous number stays empty and reversed headings do not map columns',()=>{
 const draft=convertOcrSpace(payload('Arnon',[
 {Words:[word('CORRETOR',150,100,120),word('Nº',440,100,20),word('GERENTE',620,100,100)]},
 {Words:[word('1',20,150,10),word('Arnon',130,150,70),word('O1',440,150,20)]}
 ]));assert.equal(draft.linhas[0].numero_sorteado,null);
});
test('provider errors, partial output, empty text, multiple pages and oversized input are rejected',()=>{
 for(const p of [{IsErroredOnProcessing:true},payload(''),{ParsedResults:[{},{}]},payload('Arnon'.repeat(11000))])assert.throws(()=>convertOcrSpace(p));
 const p=payload('Arnon');p.ParsedResults[0].FileParseExitCode=2;assert.throws(()=>convertOcrSpace(p));
});
test('raw text survives literally; returned row has no approval or canonical authority',()=>{
 const raw='<script>alert(1)</script>';const d=convertOcrSpace(payload(raw));assert.equal(d.texto_original,raw);assert.equal(d.linhas[0].nome_lido,null);assert.equal(d.aprovado,undefined);assert.equal(d.linhas[0].gerente,null);
});

test('real OCR.space synthetic response maps three participants and remains pending',()=>{
 const d=convertOcrSpace(require('./fixtures/ocr-space-synthetic-response.json'));
 assert.equal(d.metodo_leitura,'overlay');assert.deepEqual(d.linhas.map(l=>[l.posicao_impressa,l.nome_lido,l.numero_sorteado]),[[1,'Arnon','03'],[2,'Paola','01'],[3,'Wagner','02']]);
 assert.equal(d.data,null);assert.equal(d.periodo,null);assert.ok(d.linhas.every(l=>l.confianca==='baixa'));
});
test('markdown table and explicit tabs are accepted, without headers becoming people',()=>{
 const d=convertOcrSpace(payload('| Linha | Corretor | Nº |\n|---|---|---|\n| 16 | Paola | 01 |'));
 assert.equal(d.linhas.length,1);assert.equal(d.linhas[0].posicao_impressa,16);assert.equal(d.linhas[0].numero_sorteado,'01');
});
