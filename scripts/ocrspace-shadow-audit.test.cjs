'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {compareExports}=require('./ocrspace-shadow-audit.cjs');
const brokers=require('../data/print-brokers.json').brokers;
function fixtures(names,ocr){
  return {
    geminiExport:{operations:[{output:{'Bundle 1':{result:{linhas:names.map(([posicao_impressa,nome_lido])=>({posicao_impressa,nome_lido,numero_sorteado:'01'}))}}}}]},
    ocrExport:{operations:[{output:{'Bundle 1':{data:{IsErroredOnProcessing:false,OCRExitCode:1,ParsedResults:[{FileParseExitCode:1,ParsedText:ocr}]}}}}]}
  };
}
test('classifies identical, divergent, missing OCR and both blank separately',()=>{
 const f=fixtures([[1,'Arnon'],[2,'Daniel'],[3,'Laura'],[4,null]],'***Corretor***\n1 ARNON\n2 DANYEL\n3\n4\n***Diretor***\nRenan\nRenan');
 const r=compareExports({...f,brokers});
 assert.deepEqual([r.resumo.iguais,r.resumo.divergentes,r.resumo.sem_leitura_ocr,r.resumo.ambos_sem_nome],[1,1,1,1]);
 assert.equal(r.evidencia_diretor.diretor_ocr_nao_vinculado,'Renan');
 assert.equal(r.autorizado_base_estatistica,false);
 assert.ok(r.linhas.every(row=>!Object.hasOwn(row,'numero_sorteado')));
});
test('second photo representative: 12 identical, 15 divergent and 3 no OCR',()=>{
 const names=['ARNON','DANIEL','VALERIA','BENEDITO','AURORA','ASHLEY','NAIR','SABRINA','MAGALHAES','ANTONIA','PRINA','LEONORA','KATIO','WAGNER','VICENTE','PAOLA','LUTELA','MONARA','LOTUS','SANCHES','AMORA','LUMA','LOBO','BELISARIO','ALINE','GELASIO','LAURA',null,'GLOBZ','MADRI'];
 const ocrNames=['ARNON','DANIELS Geo','VALEMA','BEHESIT O','Aurora','CABALLY','Vain','Sobrina','MAGALHAES','Antonior','Prima','Leonora','KAT','WAGNER','VICENTE','PAOLA','Luteha','Monarc','Lotus','Sanches','Amora','Luma','030 Ansola','', 'Alive','Gelasw','Laura','','','MADE'];
 const raw=['***Corretor***','N°','DATA-06/20/2026','PERÍODO - DAVIDE',...ocrNames.map((v,i)=>String(i+1)+(v?' '+v:'')),...Array.from({length:10},(_,i)=>String(i+31)),'04 CAZARIN','***Gerente***','***Diretor***','Renan','Renan'].join('\n');
 const f=fixtures(names.map((n,i)=>[i+1,n]),raw);
 const r=compareExports({...f,brokers});
 assert.equal(r.resumo.linhas_gemini,30);
 assert.deepEqual([r.resumo.iguais,r.resumo.divergentes,r.resumo.sem_leitura_ocr,r.resumo.ambos_sem_nome],[12,15,2,1]);
 assert.equal(r.resumo.linhas_ocr,40);
 assert.ok(r.inconsistencias_ocr.includes('OCR_COLUMN_ALIGNMENT_UNVERIFIED'));
});
test('rejects untrusted OCR export and duplicate positions',()=>{
 const f=fixtures([[1,'Arnon'],[1,'Daniel']],'***Corretor***\n1 Arnon');
 assert.throws(()=>compareExports({...f,brokers}),/duplicate/);
 f.geminiExport.operations[0].output['Bundle 1'].result.linhas.pop();
 f.ocrExport.operations[0].output['Bundle 1'].data.IsErroredOnProcessing=true;
 assert.throws(()=>compareExports({...f,brokers}),/unsuccessful/);
});
