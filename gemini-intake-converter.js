(function(root,factory){
const api=factory(typeof module==='object'&&module.exports?require('./intake-normalization.js'):root.RoletaIntakeNormalization);if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RoletaGeminiConverter=api;
})(typeof globalThis==='object'?globalThis:null,function(normalization){
'use strict';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const num=v=>v!==null&&v!==undefined&&/^\d+$/.test(String(v).trim())?Number(v):null;
function iso(v){return normalization.dateInfo(v)?.iso??null;}
function convertGeminiDraft(input,dto,{aliases={}}={}){
const src=typeof input==='string'?JSON.parse(input):input;
if(!src||!Array.isArray(src.linhas))throw Error('Gemini: linhas ausentes.');
const brokers=Array.isArray(dto)?dto:dto?.brokers;
if(!Array.isArray(brokers))throw Error('Cadastro print-brokers.json ausente.');
const pendencias=[],add=(code,message,posicao)=>pendencias.push({code,message,...(posicao===undefined?{}:{posicao})});
const empreendimento=norm(src.empreendimento),data=iso(src.data),periodo=norm(src.periodo);
if(empreendimento!=='CAMINHOS DA LAPA')add('EMPREENDIMENTO','Confirmar empreendimento CAMINHOS DA LAPA.');
if(!data)add('DATA','Data inválida.');
if(!['MANHA','MANHÃ','TARDE','INTEGRAL'].includes(periodo))add('PERIODO','Período inválido.');
const seenPos=new Set(),seenNum=new Set(),seenNames=new Set();
const linhas=src.linhas.map(l=>{
const pos=num(l?.posicao_impressa),sorteado=num(l?.numero_sorteado),nome_lido=String(l?.nome_lido||'').trim(),key=norm(nome_lido);
if(pos===null||pos<1||seenPos.has(pos))add('POSICAO_FISICA','Posição ausente/duplicada.',pos);
if(pos!==null)seenPos.add(pos);
const resolved=normalization.resolveDraftName(nome_lido,brokers,{aliases,manager:l?.gerente_lido??l?.gerente});
const b=resolved.broker,resolucao=resolved.method;
const canonicalKey=b?norm(b.nome):key;
if(!b)add('NOME_NAO_RESOLVIDO','Nome não confirmado no cadastro: '+nome_lido,pos);
if(b&&seenNames.has(canonicalKey))add('NOME_DUPLICADO','Corretor duplicado.',pos);
if(b)seenNames.add(canonicalKey);
if(sorteado===null||sorteado<1)add('SORTEIO_AUSENTE','Número sorteado ausente.',pos);
if(sorteado!==null&&seenNum.has(sorteado))add('SORTEIO_DUPLICADO','Número sorteado duplicado.',pos);
if(sorteado!==null)seenNum.add(sorteado);
return {posicao_impressa:pos,numero_sorteado:sorteado,nome_lido,nome:b?.nome||'',creci:b?.creci||'',gerente:b?.gerente||'',diretor:b?.diretor||'',status_creci:b?.status_creci||'',cadastro_confirmado:!!b,cadastro_resolucao:b?resolucao:null,gerente_lido:String(l?.gerente_lido??l?.gerente??''),confianca_visual:l?.confianca||null};
});
// Only records carrying a unique, positive drawn number are SALÃO candidates.
// Rows without a drawn number stay in a separate pending bucket; class must be confirmed by a human.
const sorteados=linhas.filter(l=>l.numero_sorteado!==null&&l.numero_sorteado>0);
const semSorteio=linhas.filter(l=>l.numero_sorteado===null||l.numero_sorteado<1);
const N=sorteados.length;
const permutacao=N>0&&seenNum.size===N&&Array.from({length:N},(_,i)=>i+1).every(x=>seenNum.has(x));
if(!permutacao)add('ORDEM_INCOMPLETA','Números sorteados não formam sequência completa 1..N.');
// Gemini's quantidade_corretores may refer to HELBOR, so it is never an authority for Tegra N.
if(num(src.quantidade_corretores)!==N)add('QUANTIDADE_DECLARADA_DIVERGENTE','Quantidade declarada ('+String(src.quantidade_corretores??'?')+') diverge do SALÃO sorteado ('+N+'); conferir se corresponde a HELBOR.');
if(semSorteio.length)add('LINHAS_SEM_SORTEIO','Há '+semSorteio.length+' nomes sem sorteio: confirmar STAND BY/ON-LINE ou excluir após conferência.');
add('HELBOR_PENDENTE','Quantidade Helbor deve ser confirmada na folha; não é a quantidade Tegra.');
add('SHARE_PENDENTE','Posições de empresa/share não confirmadas.');
add('CLASSES_PENDENTES','SALÃO/STAND BY/ON-LINE requerem classificação humana.');
const ordenadas=[...sorteados].sort((a,b)=>a.numero_sorteado-b.numero_sorteado);
const payload={schema:'rlt-print-v2',empreendimento:empreendimento==='CAMINHOS DA LAPA'?'CAMINHOS DA LAPA':String(src.empreendimento||''),data,periodo:periodo==='MANHA'?'MANHÃ':periodo,empresa:'TEGRA',
tegra_qtd:N,helbor_qtd:null,resultado:{empresa:'TEGRA',numero:null,numero_exposto:false},
salao:ordenadas.map(l=>({ordem_final:permutacao?l.numero_sorteado:null,nome:l.nome,creci:l.creci,gerente:l.gerente,diretor:l.diretor,status_creci:l.status_creci})),standby:[],online:[],pendencias};
return {status:'PENDENTE_REVISAO',aprovado:false,impressao_liberada:false,salvamento_liberado:false,payload,pendencias,leitura_original:{...src,linhas},sorteados:ordenadas,sem_sorteio:semSorteio};
}
return {convertGeminiDraft};
});