'use strict';

/** Shadow-only comparison. Never validates a draw or persists anything. */
const {normalize, reconcileOcrSpace} = require('./ocrspace-shadow-reconciler.cjs');

function extractGemini(exported) {
  const result=exported?.operations?.[0]?.output?.['Bundle 1']?.result;
  if (!result || !Array.isArray(result.linhas)) throw new Error('Invalid Gemini export');
  return result;
}
function extractOcrText(exported) {
  const bundle=exported?.operations?.[0]?.output?.['Bundle 1']?.data;
  if (bundle?.IsErroredOnProcessing !== false || bundle?.OCRExitCode !== 1) throw new Error('OCR processing unsuccessful');
  const entries=bundle?.ParsedResults;
  if (!Array.isArray(entries) || entries.length!==1 || entries[0]?.FileParseExitCode!==1 || typeof entries[0].ParsedText!=='string')
    throw new Error('Invalid OCR.space export');
  return entries[0].ParsedText;
}
function compareExports({geminiExport,ocrExport,brokers}) {
  const gemini=extractGemini(geminiExport);
  const ocr=reconcileOcrSpace({parsedText:extractOcrText(ocrExport),brokers});
  if (gemini.linhas.length>200) throw new Error('Invalid Gemini line count');
  const byPosition=new Map(ocr.linhas.map(l=>[l.posicao_fisica,l]));
  const positions=new Set();
  const summary={linhas_gemini:gemini.linhas.length,iguais:0,divergentes:0,sem_leitura_ocr:0,ambos_sem_nome:0,linhas_ocr:ocr.linhas.length};
  const linhas=gemini.linhas.map(g=>{
    const posicao=g.posicao_impressa;
    if (!Number.isInteger(posicao)||posicao<1||posicao>200||positions.has(posicao)) throw new Error('Invalid/duplicate Gemini physical position');
    positions.add(posicao);
    const o=byPosition.get(posicao);
    const geminiName=typeof g.nome_lido==='string'?g.nome_lido.trim():'';
    const ocrName=o?.nome_ocr?.trim()||'';
    let situacao;
    if(!geminiName&&!ocrName) {situacao='AMBOS_SEM_NOME';summary.ambos_sem_nome++;}
    else if (!ocrName) {situacao='SEM_LEITURA_OCR';summary.sem_leitura_ocr++;}
    else if (geminiName&&normalize(geminiName)===normalize(ocrName)) {situacao='IGUAL';summary.iguais++;}
    else {situacao='DIVERGENTE';summary.divergentes++;}
    return {
      posicao,gemini:geminiName||null,ocr_space:ocrName||null,situacao,
      candidato_oficial:o?.confirmado?.nome||null,
      sugestoes:(o?.candidatos||[]).map(x=>x.nome)
    };
  });
  return {
    schema:'rlt-ops-02-audit-v1',mode:'SHADOW',
    resumo:summary,linhas,
    inconsistencias_ocr:ocr.inconsistencias,
    evidencia_diretor:ocr.evidencia_diretor,
    autorizado_impressao:false,autorizado_base_estatistica:false
  };
}
module.exports={extractGemini,extractOcrText,compareExports};
