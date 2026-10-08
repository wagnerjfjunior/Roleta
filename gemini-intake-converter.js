(function(root,factory){
const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RoletaGeminiConverter=api;
})(typeof globalThis==='object'?globalThis:null,function(){
'use strict';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const num=v=>v!==null&&v!==undefined&&/^\d+$/.test(String(v).trim())?Number(v):null;
function iso(v){const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v||''));if(!m)return null;
const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
return d.getUTCFullYear()===+m[3]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[1]?m[3]+'-'+m[2]+'-'+m[1]:null;}
function convertGeminiDraft(input,dto){
const src=typeof input==='string'?JSON.parse(input):input;
if(!src||!Array.isArray(src.linhas))throw Error('Gemini: linhas ausentes.');
const brokers=Array.isArray(dto)?dto:dto?.brokers;
if(!Array.isArray(brokers))throw Error('Cadastro print-brokers.json ausente.');
const index=new Map();brokers.forEach(b=>{const k=norm(b.nome);if(k)index.set(k,[...(index.get(k)||[]),b]);});
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
const matches=index.get(key)||[],b=matches.length===1?matches[0]:null;
if(!b)add('NOME_NAO_RESOLVIDO','Nome não confirmado no cadastro: '+nome_lido,pos);
if(b&&seenNames.has(key))add('NOME_DUPLICADO','Corretor duplicado.',pos);
if(b)seenNames.add(key);
if(sorteado===null||sorteado<1)add('SORTEIO_AUSENTE','Número sorteado ausente.',pos);
if(sorteado!==null&&seenNum.has(sorteado))add('SORTEIO_DUPLICADO','Número sorteado duplicado.',pos);
if(sorteado!==null)seenNum.add(sorteado);
return {posicao_impressa:pos,numero_sorteado:sorteado,nome_lido,nome:b?.nome||'',creci:b?.creci||'',gerente:b?.gerente||'',diretor:b?.diretor||'',status_creci:b?.status_creci||'',cadastro_confirmado:!!b,confianca_visual:l?.confianca||null};
});
const N=linhas.length,permutacao=N>0&&linhas.every(l=>l.numero_sorteado!==null)&&Array.from({length:N},(_,i)=>i+1).every(x=>seenNum.has(x));
if(!permutacao)add('ORDEM_INCOMPLETA','Sorteios não formam sequência completa 1..N.');
if(num(src.quantidade_corretores)!==N)add('QUANTIDADE_CONFLITANTE','Quantidade declarada difere das linhas extraídas.');
add('HELBOR_PENDENTE','Quantidade Helbor não confirmada.');
add('SHARE_PENDENTE','Posições de empresa/share não confirmadas.');
add('CLASSES_PENDENTES','SALÃO/STAND BY/ON-LINE requerem classificação humana.');
const payload={schema:'rlt-print-v2',empreendimento:empreendimento==='CAMINHOS DA LAPA'?'CAMINHOS DA LAPA':String(src.empreendimento||''),data,periodo:periodo==='MANHA'?'MANHÃ':periodo,empresa:'TEGRA',tegra_qtd:N,helbor_qtd:null,resultado:{empresa:'TEGRA',numero:null,numero_exposto:false},salao:linhas.map(l=>({ordem_final:permutacao?l.numero_sorteado:null,nome:l.nome,creci:l.creci,gerente:l.gerente,diretor:l.diretor,status_creci:l.status_creci})),standby:[],online:[],pendencias};
return {status:'PENDENTE_REVISAO',aprovado:false,impressao_liberada:false,salvamento_liberado:false,payload,pendencias,leitura_original:{...src,linhas}};
}
return {convertGeminiDraft};
});