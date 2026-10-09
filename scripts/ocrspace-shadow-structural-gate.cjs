'use strict';
/**
 * Independent structural gate for untrusted engine output.
 * No classification of unsorted names as STAND BY without human evidence.
 * Shadow-only: never prints, persists or authorizes downstream processing.
 */
function inspectStructuralGate(payload) {
  if (!payload || !Array.isArray(payload.linhas) || payload.linhas.length > 200) throw Error('Invalid OCR payload');
  const issues=[];
  const positions=new Set(),drawn=[],unassigned=[],empty=[],invalid=[];
  for(const row of payload.linhas){
    if(!row||!Number.isInteger(row.posicao_impressa)||row.posicao_impressa<1||row.posicao_impressa>200||
       positions.has(row.posicao_impressa))throw Error('Invalid or duplicated physical position');
    const pos=row.posicao_impressa;positions.add(pos);
    const name=typeof row.nome_lido==='string'?row.nome_lido.trim():'';
    const raw=row.numero_sorteado;
    if(raw==null || raw===''){
      if(name)unassigned.push(pos);
      else empty.push(pos);
      continue;
    }
    if(!/^(?:0?[1-9]|[1-9][0-9]|1[0-9]{2}|200)$/.test(String(raw))){
      invalid.push(pos);continue;
    }
    const number=Number(raw);
    if(!name)issues.push('DRAWN_POSITION_WITHOUT_NAME');
    drawn.push({posicao:pos,numero:number});
  }
  if(invalid.length)issues.push('INVALID_DRAW_NUMBER_FORMAT');
  const quantities=new Map();
  for(const r of drawn)quantities.set(r.numero,[...(quantities.get(r.numero)||[]),r.posicao]);
  const duplicates=[...quantities].filter(([,p])=>p.length>1).map(([numero,posicoes])=>({numero,posicoes}));
  if(duplicates.length)issues.push('DUPLICATE_DRAW_NUMBER');
  const missing=Array.from({length:drawn.length},(_,i)=>i+1).filter(n=>!quantities.has(n));
  const outOfRange=drawn.filter(r=>r.numero>drawn.length).map(r=>r.posicao);
  if(missing.length||outOfRange.length)issues.push('DRAW_PERMUTATION_INVALID');
  if(unassigned.length)issues.push('UNASSIGNED_NAMES_REQUIRE_HUMAN_CLASSIFICATION');
  const declared=payload.quantidade_corretores;
  const validDeclared=Number.isInteger(declared)&&declared>=0&&declared<=200;
  if(!validDeclared) issues.push('INVALID_DECLARED_COUNT');
  else if(declared!==drawn.length)issues.push('DECLARED_COUNT_MISMATCH');
  // Fail closed whenever the structure or the classification is not proven.
  const structuralValid=issues.length===0 && invalid.length===0;
  return {
    schema:'rlt-ops-02-structural-gate-v1',mode:'SHADOW',
    contagem_declarada:declared??null,contagem_numeros_sorteados:drawn.length,
    total_posicoes_lidas:positions.size,posicoes_sem_sorteio_com_nome:unassigned,
    posicoes_vazias:empty,posicoes_numero_invalido:invalid,
    numeros_duplicados:duplicates,numeros_ausentes:missing,
    posicoes_numero_fora_da_faixa:outOfRange,
    classificacao_sem_sorteio:'INDETERMINADA_ATE_REVISAO_HUMANA',
    integridade_estrutural:structuralValid?'SEM_ALERTAS':'REVISAR',
    inconsistencias:[...new Set(issues)],
    autorizado_impressao:false,autorizado_base_estatistica:false
  };
}
module.exports={inspectStructuralGate};
