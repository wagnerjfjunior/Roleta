'use strict';
/** Partial human-verified reference for the 2026-10-06 afternoon photo.
 * Review evidence only; not a canonical draw and never a write authority.
 */
const {normalize}=require('./ocrspace-shadow-reconciler.cjs');
const REFERENCE=Object.freeze({
  event_id:'2026-10-06-TARDE',
  status:'PARCIAL_HUMANO',
  salao_quantidade_confirmada:27,
  standby_quantidade_confirmada:2,
  vazio:[28],
  participantes:Object.freeze([
    {posicao_fisica:6,nome:'Ashley',numero_sorteado:'16',classe:'SALAO'},
    {posicao_fisica:7,nome:'Nair',numero_sorteado:'25',classe:'SALAO'},
    {posicao_fisica:23,nome:'Lobo',numero_sorteado:'27',classe:'SALAO'},
    {posicao_fisica:24,nome:'Belisario',numero_sorteado:'23',classe:'SALAO'},
    {posicao_fisica:29,nome:'Globz',numero_sorteado:null,classe:'STAND_BY'},
    {posicao_fisica:30,nome:'Madri',numero_sorteado:null,classe:'STAND_BY'}
  ])
});
function validatePartialReference(gemini, reference=REFERENCE) {
  if(!gemini||!Array.isArray(gemini.linhas)) throw Error('Missing Gemini lines');
  const byPosition=new Map();
  for(const row of gemini.linhas){
    const p=row.posicao_impressa;
    if(!Number.isInteger(p)||p<1||p>200||byPosition.has(p))throw Error('Invalid or duplicate physical position');
    byPosition.set(p,row);
  }
  const drawn=gemini.linhas.filter(x=>/^\d{1,2}$/.test(String(x.numero_sorteado??'')));
  const nums=drawn.map(x=>Number(x.numero_sorteado));
  const permutation=nums.length===reference.salao_quantidade_confirmada &&
    new Set(nums).size===nums.length && nums.every(n=>n>=1&&n<=nums.length);
  const checks=reference.participantes.map(record=>{
    const row=byPosition.get(record.posicao_fisica);
    const nome_confere=!!row&&normalize(row.nome_lido)===normalize(record.nome);
    const numero_confere=!!row&&(row.numero_sorteado==null?null:String(row.numero_sorteado).padStart(2,'0'))===record.numero_sorteado;
    return {...record,gemini_nome:row?.nome_lido??null,gemini_numero:row?.numero_sorteado??null,nome_confere,numero_confere};
  });
  const blank=reference.vazio.map(p=>{
    const row=byPosition.get(p);
    return {posicao_fisica:p,sem_nome:!row?.nome_lido,sem_numero:row?.numero_sorteado==null};
  });
  return {
    mode:'SHADOW',referencia:reference.event_id,referencia_status:reference.status,
    referencia_parcial:true,
    quantidade_gemini_declarada:gemini.quantidade_corretores??null,
    quantidade_com_numero:drawn.length,
    quantidade_salao_referencia:reference.salao_quantidade_confirmada,
    quantidade_standby_referencia:reference.standby_quantidade_confirmada,
    contagem_gemini_confere:gemini.quantidade_corretores===reference.salao_quantidade_confirmada,
    permutacao_estrutural_valida:permutation,
    verificacoes:checks,
    verificacao_vazio:blank,
    autorizado_impressao:false,autorizado_base_estatistica:false
  };
}
module.exports={REFERENCE,validatePartialReference};
