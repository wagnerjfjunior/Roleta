'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {compareExports}=require('./ocrspace-shadow-audit.cjs');
const downloads=process.argv[2];
if(!downloads) {console.error('Usage: node scripts/ocrspace-shadow-audit-cli.cjs <downloads_dir>');process.exitCode=2;}
else {
  try {
    const read=name=>JSON.parse(fs.readFileSync(path.join(downloads,name),'utf8'));
    const geminiExport=read('module-19-execution (7).json');
    const ocrExport=read('module-26-execution (1).json');
    const brokers=require('../data/print-brokers.json').brokers;
    const result=compareExports({geminiExport,ocrExport,brokers});
    console.table(result.linhas.map(r=>({posicao:r.posicao,gemini:r.gemini,ocr_space:r.ocr_space,situacao:r.situacao,sugestoes:r.sugestoes.join(', ')})));
    console.log('RESUMO:',JSON.stringify(result.resumo,null,2));
    console.log('INCONSISTENCIAS:',result.inconsistencias_ocr);
    console.log('SOMENTE LEITURA: sem impressao ou gravacao na base estatistica.');
  } catch(e) {console.error('Audit failed:',e.message);process.exitCode=1;}
}
