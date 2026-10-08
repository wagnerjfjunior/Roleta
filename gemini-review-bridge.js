(function(root,factory){
const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RoletaHumanBridge=api;
})(typeof globalThis==='object'?globalThis:null,function(){
'use strict';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const integer=v=>/^\d+$/.test(String(v??'').trim())?Number(v):null;
function brDate(v){const s=String(v||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);return s;}
function dateInfo(v){const s=brDate(v),m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);if(!m)return null;const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1],12));if(d.getUTCDate()!==+m[1]||d.getUTCMonth()!==+m[2]-1||d.getUTCFullYear()!==+m[3])return null;return {data:s,dia_semana:['DOMINGO','SEGUNDA-FEIRA','TERÇA-FEIRA','QUARTA-FEIRA','QUINTA-FEIRA','SEXTA-FEIRA','SÁBADO'][d.getUTCDay()]};}
function companyDraw(mode,a,b){a=integer(a);b=integer(b);const all=[1,2,3];if(!all.includes(a))return null;if(mode==='tegra_share')return {mode,tegra_positions:all.filter(n=>n!==a),helbor_positions:[a]};if(mode==='helbor_share')return {mode,tegra_positions:[a],helbor_positions:all.filter(n=>n!==a)};if(mode==='none'&&all.includes(b)&&a!==b)return {mode,tegra_positions:[a],helbor_positions:[b]};return null;}
function toCanonicalReview({source,rows,directory,header}){
const errors=[];const fail=m=>errors.push(m);
if(!Array.isArray(rows)||!rows.length)fail('Leitura sem participantes.');
const brokers=Array.isArray(directory)?directory:directory?.brokers||[];
const registry=new Map();for(const b of brokers){let k=norm(b.nome);registry.set(k,[...(registry.get(k)||[]),b]);}
if(!header?.confirmEnterprise)fail('Confirme o empreendimento na folha original.');
const date=dateInfo(header?.data);if(!date)fail('Data inválida.');
const periodo=norm(header?.periodo);if(!['MANHA','MANHÃ','TARDE','INTEGRAL'].includes(periodo))fail('Período inválido.');
const helbor=integer(header?.helbor);if(helbor===null)fail('Confirme numericamente a quantidade Helbor.');
const draw=companyDraw(header?.share,header?.position1,header?.position2);if(!draw)fail('Confirme posições do sorteio de empresa.');
const active=[],standby=[],online=[],seenPhysical=new Set(),seenBroker=new Set();
for(const [i,r] of rows.entries()){
const pos=integer(r.posicao_impressa),n=integer(r.numero_sorteado),classification=r.classe;
if(pos===null||seenPhysical.has(pos))fail('Posição impressa duplicada/ausente na linha '+(i+1)+'.');seenPhysical.add(pos);
if(!['salao','standby','online','excluir'].includes(classification)){fail('Classifique a linha impressa '+pos+'.');continue;}
if(classification==='excluir')continue;
const matches=registry.get(norm(r.nome))||[];if(matches.length!==1){fail('Corretor não confirmado unicamente no cadastro: '+r.nome+' (posição '+pos+').');continue;}
const broker=matches[0],key=norm(broker.nome);
if(seenBroker.has(key))fail('Corretor duplicado: '+broker.nome+'.');seenBroker.add(key);
const record={nome:broker.nome,creci:broker.creci,gerente:broker.gerente,diretor:broker.diretor,status_creci:broker.status_creci};
if(classification==='salao'){if(n===null||n<1)fail('Número sorteado obrigatório no SALÃO: '+broker.nome+'.');active.push({record,n});}
else if(classification==='standby'){if(n!==null)fail('STAND BY com número sorteado: '+broker.nome+'.');standby.push(record);}
else if(classification==='online'){if(n!==null)fail('ON-LINE com número sorteado: '+broker.nome+'.');online.push(record);}
}
const N=active.length,nums=active.map(r=>r.n);
if(!N)fail('SALÃO vazio.');
if(nums.length!==new Set(nums).size||nums.some(n=>n===null)||!Array.from({length:N},(_,i)=>i+1).every(n=>nums.includes(n)))fail('Ordem do sorteio deve formar 1..'+N+' sem repetição ou lacunas.');
if(errors.length)return {errors:[...new Set(errors)],payload:null};
const ordered=active.sort((a,b)=>a.n-b.n).map(({record,n})=>({...record,ordem_final:n}));
const payload={status:'VALIDADO',evento:{empreendimento:'CAMINHOS DA LAPA',data:date.data,dia_semana:date.dia_semana,periodo:periodo==='MANHA'?'MANHÃ':periodo,tegra_qtd:N,helbor_qtd:helbor,resultado:{empresa:'TEGRA',numero:null,numero_exposto:false},company_draw:draw},salao:ordered,standby,online,pendencias:[]};
return {errors:[],payload};
}
return {toCanonicalReview};
});