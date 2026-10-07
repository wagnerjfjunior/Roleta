(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const RESOLVED_STATES=new Set(['EXACT_MATCH','USER_CONFIRMED']);

  function normalizePayload(input){
    const p=typeof input==='string'?JSON.parse(input):input;
    if(!p||typeof p!=='object')throw new Error('JSON inválido.');
    p.standby=Array.isArray(p.standby)?p.standby:[];
    p.online=Array.isArray(p.online)?p.online:[];
    p.salao=Array.isArray(p.salao)?p.salao:[];
    p.pendencias=Array.isArray(p.pendencias)?p.pendencias:[];
    return p;
  }

  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function parseCSV(text){
    const rows=[]; let row=[],field='',quoted=false;
    const pushField=()=>{row.push(field);field=''};
    const pushRow=()=>{if(row.some(x=>String(x).trim()!==''))rows.push(row);row=[]};
    for(let i=0;i<String(text||'').length;i++){
      const c=text[i],n=text[i+1];
      if(c==='"'&&quoted&&n==='"'){field+='"';i++;continue}
      if(c==='"'){quoted=!quoted;continue}
      if(c===','&&!quoted){pushField();continue}
      if((c==='\n'||c==='\r')&&!quoted){
        if(c==='\r'&&n==='\n')i++;
        pushField();pushRow();continue;
      }
      field+=c;
    }
    pushField();pushRow();
    if(!rows.length)return [];
    const headers=rows[0].map(x=>String(x).trim());
    return rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'').trim()])));
  }

  function brokerFromCsvRow(r){
    return {
      nome:String(r['Nome Comercial']||'').trim(),
      gerente:String(r.Equipe||'').trim(),
      diretor:String(r.Diretor||'').trim(),
      empresa:String(r.Empresa||'').trim(),
      tipo_creci:String(r['Tipo CRECI']||'').trim(),
      creci:String(r.CRECI||'').trim(),
      cargo:String(r.Cargo||'').trim(),
      status_creci:String(r['Tipo CRECI']||'').trim()
    };
  }

  function dedupeBrokers(rows){
    const seen=new Set(),out=[];
    (rows||[]).map(r=>r&&r.nome!==undefined?r:brokerFromCsvRow(r)).forEach(b=>{
      if(!b.nome)return;
      const key=[norm(b.nome),norm(b.gerente),norm(b.creci)].join('|');
      if(seen.has(key))return;
      seen.add(key);out.push(b);
    });
    return out;
  }

  function levenshtein(a,b){
    a=norm(a);b=norm(b);
    if(a===b)return 0;
    if(!a.length)return b.length;
    if(!b.length)return a.length;
    const prev=Array.from({length:b.length+1},(_,i)=>i),cur=new Array(b.length+1);
    for(let i=1;i<=a.length;i++){
      cur[0]=i;
      for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      for(let j=0;j<=b.length;j++)prev[j]=cur[j];
    }
    return prev[b.length];
  }

  function nameSimilarity(a,b){
    const aa=norm(a),bb=norm(b);
    if(!aa||!bb)return 0;
    if(aa===bb)return 1;
    const base=1-(levenshtein(aa,bb)/Math.max(aa.length,bb.length));
    const compactA=aa.replace(/\s+/g,''),compactB=bb.replace(/\s+/g,'');
    const prefix=(compactA.startsWith(compactB)||compactB.startsWith(compactA))?0.04:0;
    return Math.max(0,Math.min(1,base+prefix));
  }

  function managerEvidence(rawManager,officialManager){
    const a=norm(rawManager),b=norm(officialManager);
    if(!a||!b)return {match:false,similarity:0,boost:0};
    const sim=nameSimilarity(a,b);
    const match=a===b||sim>=0.86;
    return {match,similarity:sim,boost:match?0.08:0};
  }

  function candidateObject(b,rawName,rawManager){
    const ns=nameSimilarity(rawName,b.nome);
    const me=managerEvidence(rawManager,b.gerente);
    return {
      nome:b.nome,gerente:b.gerente,diretor:b.diretor,creci:b.creci,status_creci:b.status_creci,
      name_similarity:Number(ns.toFixed(4)),manager_match:me.match,manager_similarity:Number(me.similarity.toFixed(4)),
      score:Number(Math.min(1,ns+me.boost).toFixed(4))
    };
  }

  function applyOfficialBroker(row,b,status,extra){
    row.nome=b.nome;
    row.creci=b.creci;
    row.gerente=b.gerente;
    row.diretor=b.diretor;
    row.status_creci=b.status_creci;
    row.reconciliation=Object.assign({},row.reconciliation||{},extra||{}, {
      status,
      official_name:b.nome,
      official_manager:b.gerente,
      registry_source:'data/brokers-official.csv'
    });
    row.match_status=status;
    return row;
  }

  function reconcileRow(row,brokers){
    const roster=dedupeBrokers(brokers);
    const previous=row.reconciliation||{};
    const rawName=String(previous.raw_name??row.raw_name??row.nome??'').trim();
    const rawManager=String(previous.manager_raw??row.manager_raw??row.gerente_raw??row.gerente??'').trim();
    row.reconciliation=Object.assign({},previous,{raw_name:rawName,manager_raw:rawManager,registry_source:'data/brokers-official.csv'});

    if(String(previous.status||row.match_status||'').toUpperCase()==='USER_CONFIRMED')return row;
    const exact=roster.filter(b=>norm(b.nome)===norm(rawName));
    if(rawName&&exact.length===1){
      return applyOfficialBroker(row,exact[0],'EXACT_MATCH',{
        raw_name:rawName,manager_raw:rawManager,candidates:[candidateObject(exact[0],rawName,rawManager)]
      });
    }

    const ranked=roster.map(b=>candidateObject(b,rawName,rawManager))
      .sort((a,b)=>b.score-a.score||b.name_similarity-a.name_similarity||a.nome.localeCompare(b.nome,'pt-BR'))
      .slice(0,3);
    const top=ranked[0],second=ranked[1];
    const margin=top?(top.score-(second?.score||0)):0;
    let status='AMBIGUOUS';
    if(top&&top.name_similarity>=0.72&&margin>=0.12)status='PROBABLE_MATCH';
    else if(top&&top.name_similarity>=0.64&&top.manager_match&&margin>=0.06)status='PROBABLE_MATCH';
    row.reconciliation=Object.assign({},row.reconciliation,{status,candidates:ranked,score_margin:Number(margin.toFixed(4))});
    row.match_status=status;
    return row;
  }

  function reconcilePayload(p,brokers){
    const roster=dedupeBrokers(brokers);
    if(!roster.length)throw new Error('Cadastro oficial vazio: data/brokers-official.csv não pôde ser carregado.');
    for(const rows of [p.salao||[],p.standby||[],p.online||[]])rows.forEach(r=>reconcileRow(r,roster));
    p.reconciliation_registry={source:'data/brokers-official.csv',broker_count:roster.length};
    return p;
  }

  function reconciliationState(r){
    const s=String(r?.reconciliation?.status||r?.match_status||'').toUpperCase();
    return s||'LEGACY_UNVERIFIED';
  }

  function rowEntries(p){
    return [['salao','SALÃO',p.salao||[]],['standby','STAND-BY',p.standby||[]],['online','ON-LINE',p.online||[]]];
  }

  function reconciliationGate(p){
    const errors=[],pending=[];
    const entries=rowEntries(p).flatMap(([group,label,rows])=>rows.map((row,index)=>({group,label,row,index})));
    if(!entries.length)return {mode:'V2',errors:['Nenhum corretor informado.'],pending:[]};
    entries.forEach(item=>{
      const s=reconciliationState(item.row);
      if(!RESOLVED_STATES.has(s)){
        const candidates=item.row?.reconciliation?.candidates;
        pending.push({...item,status:s});
        if(!Array.isArray(candidates)||!candidates.length)errors.push(item.label+' linha '+(item.index+1)+': sem candidatos oficiais para confirmação.');
      }
    });
    return {mode:'V2',errors:[...new Set(errors)],pending};
  }

  function physicalReviewErrors(p){
    const errors=[]; const rows=p.salao||[],N=rows.length;
    const positions=[],draws=[],orders=[];
    rows.forEach((r,i)=>{
      const pos=Number(r.physical_position??r.posicao_fisica);
      const draw=Number(r.drawn_number??r.numero_sorteado);
      const order=Number(r.ordem_final);
      if(!Number.isInteger(pos)||pos<1)errors.push('SALÃO linha '+(i+1)+': posição física ausente/inválida.'); else positions.push(pos);
      if(!Number.isInteger(draw)||draw<1||draw>N)errors.push('SALÃO linha '+(i+1)+': número sorteado ausente/inválido.'); else draws.push(draw);
      if(!Number.isInteger(order)||order<1||order>N)errors.push('SALÃO linha '+(i+1)+': ordem final ausente/inválida.'); else orders.push(order);
      if(Number.isInteger(draw)&&Number.isInteger(order)&&draw!==order)errors.push('SALÃO linha '+(i+1)+': número sorteado ('+draw+') difere da ordem final ('+order+').');
    });
    if(new Set(positions).size!==positions.length)errors.push('Posições físicas duplicadas no SALÃO.');
    const expected=Array.from({length:N},(_,i)=>i+1);
    if(draws.length===N&&draws.slice().sort((a,b)=>a-b).some((v,i)=>v!==expected[i]))errors.push('Números sorteados devem formar a permutação completa 1..'+N+'.');
    if(orders.length===N&&orders.slice().sort((a,b)=>a-b).some((v,i)=>v!==expected[i]))errors.push('ordem_final deve formar sequência completa de 1 a '+N+'.');
    return [...new Set(errors)];
  }

  function validatePayload(p){
    const errors=[];
    if(p.status!=='VALIDADO')errors.push('status precisa ser VALIDADO.');
    const e=p.evento||{};
    if(String(e.empreendimento||'').trim().toUpperCase()!=='CAMINHOS DA LAPA')errors.push('empreendimento deve ser CAMINHOS DA LAPA.');
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(String(e.data||'')))errors.push('data deve estar em DD/MM/AAAA.');
    if(!String(e.dia_semana||'').trim())errors.push('dia_semana ausente.');
    if(!['MANHA','MANHÃ','TARDE','INTEGRAL'].includes(String(e.periodo||'').trim().toUpperCase()))errors.push('periodo deve ser MANHÃ, TARDE ou INTEGRAL.');
    if(!Number.isInteger(Number(e.helbor_qtd))||Number(e.helbor_qtd)<0)errors.push('helbor_qtd deve ser informado.');
    if(!e.sorteio_empresa||!String(e.sorteio_empresa.tg||'').trim()||!String(e.sorteio_empresa.hb||'').trim())errors.push('resultado TG/HB ausente.');
    const N=p.salao.length;
    if(!N)errors.push('salao vazio.');
    if(Number(e.tegra_qtd)!==N)errors.push('tegra_qtd ('+e.tegra_qtd+') difere da quantidade de corretores do SALÃO ('+N+').');
    if(Array.isArray(p.pendencias)&&p.pendencias.length)errors.push('Existem pendências abertas no payload.');

    for(const [groupName,rows] of [['SALÃO',p.salao],['STAND-BY',p.standby],['ON-LINE',p.online]]){
      rows.forEach((r,i)=>{
        if(RESOLVED_STATES.has(reconciliationState(r))){
          for(const k of ['nome','creci','gerente','diretor','status_creci'])if(!String(r?.[k]??'').trim())errors.push(groupName+' linha '+(i+1)+': '+k+' ausente após reconciliação.');
        }
      });
    }
    errors.push(...physicalReviewErrors(p));
    return [...new Set(errors)];
  }

  function findCandidate(row,candidateName){
    const target=norm(candidateName);
    return (row?.reconciliation?.candidates||[]).find(c=>norm(typeof c==='string'?c:(c.nome||c.name))===target)||null;
  }

  function confirmCandidate(p,group,index,candidateName,brokers,now){
    const rows=p[group];
    if(!Array.isArray(rows)||!rows[index])throw new Error('Linha de reconciliação inválida.');
    const row=rows[index],state=reconciliationState(row);
    if(RESOLVED_STATES.has(state))return row;
    const candidate=findCandidate(row,candidateName);
    if(!candidate)throw new Error('Escolha um candidato da lista curta oficial.');
    const roster=dedupeBrokers(brokers);
    const broker=roster.find(b=>norm(b.nome)===norm(candidate.nome||candidate.name));
    if(!broker)throw new Error('Candidato não encontrado em data/brokers-official.csv.');
    const rawName=row.reconciliation?.raw_name??row.raw_name??row.nome;
    const rawManager=row.reconciliation?.manager_raw??row.manager_raw??row.gerente;
    applyOfficialBroker(row,broker,'USER_CONFIRMED',{
      raw_name:rawName,manager_raw:rawManager,candidates:row.reconciliation.candidates,
      confirmed_name:broker.nome,confirmed_manager:broker.gerente,
      confirmed_at:now||new Date().toISOString(),confirmation_source:'RLT_RECONCILIATION_V2_ROW'
    });
    return row;
  }

  function markPrintValidated(p,now){
    const rg=reconciliationGate(p),pe=physicalReviewErrors(p),base=validatePayload(p);
    if(rg.pending.length||rg.errors.length||pe.length||base.length)throw new Error('Evento ainda não está VALIDADO PARA IMPRESSÃO.');
    p.print_validation={status:'VALIDADO_PARA_IMPRESSAO',validated_at:now||new Date().toISOString(),scope:'identity_and_physical_mapping'};
    return p;
  }

  function finalizeStatisticalConfirmation(p,now){
    markPrintValidated(p,now);
    p.canonical_confirmation={
      status:'CANONICO_PARA_ESTATISTICA',confirmed_at:now||new Date().toISOString(),
      scope:'physical_position_name_manager_drawn_number_final_order',human_gate:true
    };
    return p;
  }

  function canonicalStatisticalPayload(p){
    if(p?.canonical_confirmation?.status!=='CANONICO_PARA_ESTATISTICA')throw new Error('Ingestão estatística bloqueada: falta confirmação humana final.');
    const rg=reconciliationGate(p);
    if(rg.pending.length||rg.errors.length||physicalReviewErrors(p).length)throw new Error('Ingestão estatística bloqueada: reconciliação ou mapeamento físico pendente.');
    return JSON.parse(JSON.stringify(p));
  }

  function printRow(r,index,useOrder){
    const n=useOrder?Number(r.ordem_final):index+1;
    return '<div class="rltv2-grid rltv2-row '+(index%2?'shade':'')+'">'+
      '<span>'+n+'</span><span>'+esc(r.nome)+'</span><span>'+esc(r.creci)+'</span><span>'+esc(r.gerente)+'</span><span>'+esc(r.diretor)+'</span><span>'+esc(r.status_creci)+'</span></div>';
  }

  function section(rows,title,useOrder){
    if(!rows.length)return '';
    const ordered=useOrder?[...rows].sort((a,b)=>Number(a.ordem_final)-Number(b.ordem_final)):rows;
    return (title?'<div class="rltv2-section">'+esc(title)+'</div>':'')+
      '<div class="rltv2-grid rltv2-head"><span>Nº</span><span>NOME</span><span>CRECI</span><span>GERENTE</span><span>DIRETOR</span><span>STATUS CRECI</span></div>'+
      ordered.map((r,i)=>printRow(r,i,useOrder)).join('');
  }

  function renderCanonical(host,p){
    const e=p.evento;
    const tg='TG '+String(e.sorteio_empresa.tg).replace(/^TG\s*/i,'').trim();
    const hb='HB '+String(e.sorteio_empresa.hb).replace(/^HB\s*/i,'').trim();
    host.innerHTML='<div class="rltv2-sheet">'+
      '<div class="rltv2-grid rltv2-header-line rltv2-header-labels"><span class="merge12">EMPREENDIMENTO</span><span class="c3">DATA</span><span class="c4">HELBOR '+esc(e.helbor_qtd)+'</span><span class="c5">PERÍODO</span><span class="c6">SORTEIO DE EMPRESA</span></div>'+
      '<div class="rltv2-grid rltv2-header-line rltv2-header-values"><span class="merge12">CAMINHOS DA LAPA</span><span class="c3">'+esc(e.data)+'</span><span class="c4">'+esc(e.dia_semana)+'</span><span class="c5">'+esc(String(e.periodo).replace('MANHA','MANHÃ'))+'</span><span class="c6 rltv2-company-split"><b>'+esc(tg)+'</b><b>'+esc(hb)+'</b></span></div>'+
      section(p.salao,'',true)+section(p.standby,'STAND-BY',false)+section(p.online,'ON-LINE',false)+'</div>';
  }

  function reconciliationReview(p){
    const entries=rowEntries(p).flatMap(([group,label,rows])=>rows.map((row,index)=>({group,label,row,index})));
    return '<div class="rltv2-reconciliation"><div class="section-head"><div><span class="eyebrow">GATE DE RECONCILIAÇÃO</span><h3>Identidade linha a linha</h3></div></div><div class="rltv2-reconcile-list">'+
      entries.map(({group,label,row,index})=>{
        const rec=row.reconciliation||{},s=reconciliationState(row),ok=RESOLVED_STATES.has(s),raw=rec.raw_name||row.raw_name||row.nome||'—';
        const candidates=Array.isArray(rec.candidates)?rec.candidates:[];
        const control=ok?'':('<div class="rltv2-candidate-control"><select data-reconcile-select="'+group+':'+index+'"><option value="">Selecione o corretor confirmado…</option>'+candidates.map(c=>{const name=typeof c==='string'?c:(c.nome||c.name||'');const mgr=typeof c==='string'?'':(c.gerente||'');const sim=typeof c==='string'?'':(' · nome '+Math.round(Number(c.name_similarity||0)*100)+'%');return '<option value="'+esc(name)+'">'+esc(name)+(mgr?' · '+esc(mgr):'')+sim+'</option>'}).join('')+'</select><button type="button" class="simulation-run" data-reconcile-confirm="'+group+':'+index+'">Confirmar identidade</button></div>');
        return '<div class="rltv2-reconcile-item"><div><strong>'+esc(label)+' '+(index+1)+' · leitura: '+esc(raw)+'</strong><span class="'+(ok?'pill-up':'pill-cold')+'">'+esc(s)+'</span></div><small>Reconciliado: '+esc(ok?row.nome:'—')+' · gerente: '+esc(ok?row.gerente:'—')+'</small>'+control+'</div>';
      }).join('')+'</div></div>';
  }

  function physicalReview(p){
    const rows=[...(p.salao||[])].sort((a,b)=>Number(a.physical_position??a.posicao_fisica)-Number(b.physical_position??b.posicao_fisica));
    return '<div class="rltv2-physical-review"><div class="section-head"><div><span class="eyebrow">GATE FÍSICO</span><h3>Posição → identidade → sorteio → ordem final</h3></div></div><div class="rltv2-review-table"><div class="rltv2-review-row head"><span>Pos. física</span><span>Nome reconciliado</span><span>Gerente</span><span>Nº sorteado</span><span>Ordem final</span></div>'+rows.map(r=>'<div class="rltv2-review-row"><span>'+esc(r.physical_position??r.posicao_fisica??'—')+'</span><span>'+esc(r.nome||'—')+'</span><span>'+esc(r.gerente||'—')+'</span><span>'+esc(r.drawn_number??r.numero_sorteado??'—')+'</span><span>'+esc(r.ordem_final??'—')+'</span></div>').join('')+'</div></div>';
  }

  function previewSummary(p){
    const e=p.evento;
    return '<div class="rltv2-summary"><span><b>SALÃO</b> '+p.salao.length+'</span><span><b>STAND-BY</b> '+p.standby.length+'</span><span><b>ON-LINE</b> '+p.online.length+'</span><span><b>HELBOR</b> '+esc(e.helbor_qtd)+'</span><span><b>SORTEIO</b> TG '+esc(e.sorteio_empresa.tg)+' | HB '+esc(e.sorteio_empresa.hb)+'</span></div>';
  }

  async function loadOfficialBrokers(){
    const r=await fetch('/data/brokers-official.csv',{cache:'no-store'});
    if(!r.ok)throw new Error('Falha ao carregar data/brokers-official.csv.');
    return dedupeBrokers(parseCSV(await r.text()).map(brokerFromCsvRow));
  }

  function mount(host){
    let payload=null,officialBrokers=[];
    host.innerHTML='<div class="workspace-page-head"><div><span class="eyebrow">RLT-PRINT-V2</span><h2>Gerador canônico</h2><p>O JSON é reconciliado novamente contra <strong>data/brokers-official.csv</strong> antes da impressão e antes de qualquer liberação estatística.</p></div></div>'+
      '<article class="card rltv2-import-card"><div class="section-head"><div><span class="eyebrow">1 · DADOS</span><h2>Importar JSON da Skill</h2></div><span class="intake-risk">RECONCILIAÇÃO OBRIGATÓRIA</span></div><textarea id="rltv2Json" class="rltv2-json" rows="16" spellcheck="false" placeholder="{ ... JSON VALIDADO da Skill ... }"></textarea><div class="intake-actions"><button id="rltv2Paste" class="simulation-run">Colar JSON</button><label class="rltv2-file"><input id="rltv2File" type="file" accept="application/json,.json">Carregar .json</label><button id="rltv2Validate" class="simulation-run">Reconciliar e montar prévia</button></div><div id="rltv2Gate" class="intake-gate blocked"><strong>AGUARDANDO DADOS</strong></div></article>'+
      '<article id="rltv2PreviewCard" class="card rltv2-preview-card" hidden><div class="section-head"><div><span class="eyebrow">2 · REVISÃO</span><h2>RLT-RECONCILIATION-V2</h2></div><span id="rltv2Counts" class="intake-counts"></span></div><div id="rltv2Reconciliation"></div><div id="rltv2Physical"></div><div class="rltv2-state-grid"><div><small>IMPRESSÃO</small><strong id="rltv2PrintState">BLOQUEADA</strong></div><div><small>ESTATÍSTICA</small><strong id="rltv2StatState">BLOQUEADA</strong></div></div><div id="rltv2Preview" class="rltv2-screen-preview"></div><label class="intake-confirm"><input id="rltv2Confirm" type="checkbox" disabled> Confirmo a tabela acima: posição física, identidade reconciliada, gerente/equipe, número sorteado e ordem final. Liberar este evento como CANÔNICO PARA ESTATÍSTICA.</label><div class="intake-actions"><button id="rltv2Print" class="simulation-run" disabled>Imprimir roleta final</button></div></article><section id="rltv2PrintHost" class="roulette-print-sheet" hidden></section>';

    const q=s=>host.querySelector(s),ta=q('#rltv2Json'),file=q('#rltv2File'),paste=q('#rltv2Paste'),btn=q('#rltv2Validate'),gate=q('#rltv2Gate'),card=q('#rltv2PreviewCard'),preview=q('#rltv2Preview'),reconciliation=q('#rltv2Reconciliation'),physical=q('#rltv2Physical'),counts=q('#rltv2Counts'),confirm=q('#rltv2Confirm'),print=q('#rltv2Print'),printHost=q('#rltv2PrintHost'),printState=q('#rltv2PrintState'),statState=q('#rltv2StatState');

    async function ensureRoster(){if(!officialBrokers.length)officialBrokers=await loadOfficialBrokers();return officialBrokers}
    function refresh(){
      if(!payload)return;
      reconciliation.innerHTML=reconciliationReview(payload);physical.innerHTML=physicalReview(payload);counts.innerHTML=previewSummary(payload);renderCanonical(preview,payload);
      const rg=reconciliationGate(payload),errors=validatePayload(payload),printReady=!rg.pending.length&&!rg.errors.length&&!errors.length;
      if(printReady){try{markPrintValidated(payload)}catch(_){}}
      print.disabled=!printReady;confirm.disabled=!printReady;
      printState.textContent=printReady?'VALIDADO PARA IMPRESSÃO':'BLOQUEADA';printState.className=printReady?'ok-text':'warn-text';
      const canonical=payload?.canonical_confirmation?.status==='CANONICO_PARA_ESTATISTICA';statState.textContent=canonical?'CANÔNICO PARA ESTATÍSTICA':'BLOQUEADA';statState.className=canonical?'ok-text':'warn-text';
      if(printReady){gate.className='intake-gate clear';gate.innerHTML='<strong>VALIDADO PARA IMPRESSÃO</strong><div>Todos os nomes estão resolvidos e o mapeamento físico está completo. A ingestão estatística continua bloqueada até a confirmação final abaixo.</div>'}
      else{gate.className='intake-gate blocked';gate.innerHTML='<strong>REVISÃO OBRIGATÓRIA</strong>'+[...rg.errors,...errors].map(x=>'<div>• '+esc(x)+'</div>').join('')+(rg.pending.length?'<div>• '+rg.pending.length+' identidade(s) aguardando confirmação individual.</div>':'')}
    }

    async function validateAndRender(){
      card.hidden=true;confirm.checked=false;confirm.disabled=true;print.disabled=true;payload=null;
      try{
        const p=normalizePayload(ta.value);const roster=await ensureRoster();reconcilePayload(p,roster);payload=p;card.hidden=false;refresh();
      }catch(err){gate.className='intake-gate blocked';gate.innerHTML='<strong>VALIDAÇÃO BLOQUEADA</strong><div>'+esc(err.message||err)+'</div>'}
    }

    file.addEventListener('change',async()=>{const f=file.files&&file.files[0];if(f)ta.value=await f.text()});
    paste.addEventListener('click',async()=>{try{if(!navigator.clipboard||!navigator.clipboard.readText)throw new Error('Leitura da área de transferência não está disponível neste navegador.');const text=await navigator.clipboard.readText();if(!text.trim())throw new Error('A área de transferência está vazia.');ta.value=text.trim();await validateAndRender()}catch(err){gate.className='intake-gate blocked';gate.innerHTML='<strong>NÃO FOI POSSÍVEL COLAR</strong><div>'+esc(err.message||err)+'</div>'}});
    btn.addEventListener('click',validateAndRender);
    reconciliation.addEventListener('click',async ev=>{
      const b=ev.target.closest('[data-reconcile-confirm]');if(!b||!payload)return;
      const [group,indexText]=b.dataset.reconcileConfirm.split(':'),select=reconciliation.querySelector('[data-reconcile-select="'+group+':'+indexText+'"]');
      try{confirmCandidate(payload,group,Number(indexText),select?.value||'',await ensureRoster());payload.canonical_confirmation=null;refresh()}catch(err){gate.className='intake-gate blocked';gate.innerHTML='<strong>CONFIRMAÇÃO NÃO APLICADA</strong><div>'+esc(err.message||err)+'</div>'}
    });
    confirm.addEventListener('change',()=>{
      if(!payload)return;
      if(!confirm.checked){payload.canonical_confirmation=null;refresh();return}
      try{finalizeStatisticalConfirmation(payload);refresh();gate.className='intake-gate clear';gate.innerHTML='<strong>CANÔNICO PARA ESTATÍSTICA</strong><div>Confirmação humana final registrada. O evento pode atravessar o gate de ingestão estatística.</div>'}catch(err){confirm.checked=false;gate.className='intake-gate blocked';gate.innerHTML='<strong>INGESTÃO BLOQUEADA</strong><div>'+esc(err.message||err)+'</div>'}
    });
    print.addEventListener('click',()=>{if(!payload||payload?.print_validation?.status!=='VALIDADO_PARA_IMPRESSAO')return;renderCanonical(printHost,payload);printHost.hidden=false;setTimeout(()=>window.print(),50)});
  }

  const api={normalizePayload,parseCSV,brokerFromCsvRow,dedupeBrokers,nameSimilarity,reconcileRow,reconcilePayload,reconciliationState,reconciliationGate,physicalReviewErrors,validatePayload,confirmCandidate,markPrintValidated,finalizeStatisticalConfirmation,canonicalStatisticalPayload,renderCanonical,mount};
  if(typeof window!=='undefined')window.RouletteIntake=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();