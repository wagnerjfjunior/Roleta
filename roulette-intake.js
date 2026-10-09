(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function toBRDate(value){
    const v=String(value||'').trim();
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(v))return v;
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m?m[3]+'/'+m[2]+'/'+m[1]:v;
  }

  function weekdayPT(value){
    const br=toBRDate(value),m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
    if(!m)return '';
    const d=new Date(Date.UTC(Number(m[3]),Number(m[2])-1,Number(m[1]),12));
    return ['DOMINGO','SEGUNDA-FEIRA','TERÇA-FEIRA','QUARTA-FEIRA','QUINTA-FEIRA','SEXTA-FEIRA','SÁBADO'][d.getUTCDay()];
  }

  function normalizePayload(input){
    const raw=typeof input==='string'?JSON.parse(input):input;
    if(!raw||typeof raw!=='object')throw new Error('JSON inválido.');

    const currentSchema=raw.schema==='rlt-print-v2'&&!raw.evento;
    const p={...raw};
    p.standby=Array.isArray(raw.standby)?raw.standby:[];
    p.online=Array.isArray(raw.online)?raw.online:[];
    p.salao=Array.isArray(raw.salao)?raw.salao:[];

    if(currentSchema){
      const result=raw.resultado&&typeof raw.resultado==='object'?raw.resultado:{};
      p.status='VALIDADO';
      p.evento={
        empreendimento:raw.empreendimento,
        data:toBRDate(raw.data),
        dia_semana:raw.dia_semana||weekdayPT(raw.data),
        periodo:raw.periodo,
        tegra_qtd:raw.tegra_qtd,
        helbor_qtd:raw.helbor_qtd,
        resultado:{
          empresa:String(result.empresa||raw.empresa||'TEGRA').trim(),
          numero:result.numero??null,
          numero_exposto:result.numero_exposto===true
        }
      };
    }
    return p;
  }

  function companyResult(e){
    if(e&&e.company_draw){
      const d=e.company_draw;
      const tg=Array.isArray(d.tegra_positions)?d.tegra_positions:[];
      const hb=Array.isArray(d.helbor_positions)?d.helbor_positions:[];
      const parts=[];
      if(tg.length)parts.push('TG '+tg.join(' - '));
      if(hb.length)parts.push('HB '+hb.join(' - '));
      return {parts,summary:parts.join(' | ')};
    }
    if(e&&e.resultado){
      const empresa=String(e.resultado.empresa||'TEGRA').trim()||'TEGRA';
      if(e.resultado.numero_exposto===true&&e.resultado.numero!==null&&e.resultado.numero!==undefined&&String(e.resultado.numero).trim()!==''){
        return {parts:[empresa+' '+String(e.resultado.numero).trim()],summary:empresa+' '+String(e.resultado.numero).trim()};
      }
      return {parts:[empresa],summary:empresa+' · número não exposto'};
    }
    const legacy=e?.sorteio_empresa||{};
    const parts=[];
    if(String(legacy.tg||'').trim())parts.push('TG '+String(legacy.tg).replace(/^TG\s*/i,'').trim());
    if(String(legacy.hb||'').trim())parts.push('HB '+String(legacy.hb).replace(/^HB\s*/i,'').trim());
    return {parts,summary:parts.join(' | ')};
  }

  function deriveCompanyDraw(mode,primary,secondary){
    const all=[1,2,3];
    const a=Number(primary),b=Number(secondary);
    if(mode==='tegra_share'){
      if(!all.includes(a))return null;
      return {mode,tegra_positions:all.filter(x=>x!==a),helbor_positions:[a]};
    }
    if(mode==='helbor_share'){
      if(!all.includes(a))return null;
      return {mode,tegra_positions:[a],helbor_positions:all.filter(x=>x!==a)};
    }
    if(mode==='none'){
      if(!all.includes(a)||!all.includes(b)||a===b)return null;
      return {mode,tegra_positions:[a],helbor_positions:[b]};
    }
    return null;
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
    const result=companyResult(e);
    if(!result.parts.length)errors.push('resultado de empresa ausente.');

    const N=p.salao.length;
    if(!N)errors.push('salao vazio.');
    if(Number(e.tegra_qtd)!==N)errors.push('tegra_qtd ('+e.tegra_qtd+') difere da quantidade de corretores do SALÃO ('+N+').');

    const orders=p.salao.map(r=>Number(r.ordem_final)).sort((a,b)=>a-b);
    for(let i=0;i<N;i++)if(orders[i]!==i+1){errors.push('ordem_final deve formar sequência completa de 1 a '+N+'.');break}

    const required=['nome','creci','gerente','diretor','status_creci'];
    for(const [groupName,rows] of [['SALÃO',p.salao],['STAND-BY',p.standby],['ON-LINE',p.online]]){
      rows.forEach((r,i)=>{
        required.forEach(k=>{if(!String(r?.[k]??'').trim())errors.push(groupName+' linha '+(i+1)+': '+k+' ausente.');});
      });
    }
    if(Array.isArray(p.pendencias)&&p.pendencias.length)errors.push('Existem pendências abertas no payload.');
    return [...new Set(errors)];
  }

  function printRow(r,index,useOrder){
    const n=useOrder?Number(r.ordem_final):index+1;
    return '<div class="rltv2-grid rltv2-row '+(index%2?'shade':'')+'">'+
      '<span>'+n+'</span>'+
      '<span>'+esc(r.nome)+'</span>'+
      '<span>'+esc(r.creci)+'</span>'+
      '<span>'+esc(r.gerente)+'</span>'+
      '<span>'+esc(r.diretor)+'</span>'+
      '<span>'+esc(r.status_creci)+'</span>'+
    '</div>';
  }

  function section(rows,title,useOrder){
    if(!rows.length)return '';
    const ordered=useOrder?[...rows].sort((a,b)=>Number(a.ordem_final)-Number(b.ordem_final)):rows;
    return (title?'<div class="rltv2-section">'+esc(title)+'</div>':'')+
      '<div class="rltv2-grid rltv2-head">'+
        '<span>Nº</span><span>NOME</span><span>CRECI</span><span>GERENTE</span><span>DIRETOR</span><span>STATUS CRECI</span>'+
      '</div>'+
      ordered.map((r,i)=>printRow(r,i,useOrder)).join('');
  }

  function renderCanonical(host,p){
    const e=p.evento;
    const company=companyResult(e);
    host.innerHTML=
      '<div class="rltv2-sheet">'+
        '<div class="rltv2-grid rltv2-header-line rltv2-header-labels">'+
          '<span class="merge12">EMPREENDIMENTO</span>'+
          '<span class="c3">DATA</span>'+
          '<span class="c4">HELBOR '+esc(e.helbor_qtd)+'</span>'+
          '<span class="c5">PERÍODO</span>'+
          '<span class="c6">SORTEIO DE EMPRESA</span>'+
        '</div>'+
        '<div class="rltv2-grid rltv2-header-line rltv2-header-values">'+
          '<span class="merge12">CAMINHOS DA LAPA</span>'+
          '<span class="c3">'+esc(e.data)+'</span>'+
          '<span class="c4">'+esc(e.dia_semana)+'</span>'+
          '<span class="c5">'+esc(String(e.periodo).replace('MANHA','MANHÃ'))+'</span>'+
          '<span class="c6 rltv2-company-split">'+company.parts.map(x=>'<b>'+esc(x)+'</b>').join('')+'</span>'+
        '</div>'+
        section(p.salao,'',true)+
        section(p.standby,'STAND-BY',false)+
        section(p.online,'ON-LINE',false)+
      '</div>';
  }

  function previewSummary(p){
    const e=p.evento,company=companyResult(e);
    return '<div class="rltv2-summary">'+
      '<span><b>SALÃO</b> '+p.salao.length+'</span>'+
      '<span><b>STAND-BY</b> '+p.standby.length+'</span>'+
      '<span><b>ON-LINE</b> '+p.online.length+'</span>'+
      '<span><b>HELBOR</b> '+esc(e.helbor_qtd)+'</span>'+
      '<span><b>SORTEIO</b> '+esc(company.summary)+'</span>'+
    '</div>';
  }

  let brokerDirectoryPromise=null;
  function normalizeName(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
  function loadBrokerDirectory(){
    if(!brokerDirectoryPromise)brokerDirectoryPromise=fetch('/data/print-brokers.json',{cache:'no-store'})
      .then(r=>{if(!r.ok)throw new Error('Falha ao carregar cadastro oficial de corretores.');return r.json()})
      .then(d=>Array.isArray(d.brokers)?d.brokers:[]);
    return brokerDirectoryPromise;
  }
  function clonePayload(p){return JSON.parse(JSON.stringify(p))}
  function reviewRowHtml(r,group,index,total){
    const pos=group==='salao'?Number(r.ordem_final||index+1):index+1;
    return '<tr data-group="'+group+'" data-original-position="'+esc(pos)+'" data-original-name="'+esc(r.nome||'')+'">'+
      '<td><input class="rltv2-review-position" inputmode="numeric" type="number" min="1" max="'+Math.max(total,1)+'" value="'+esc(pos)+'"></td>'+
      '<td><input class="rltv2-review-name" list="rltv2BrokerNames" value="'+esc(r.nome||'')+'" autocomplete="off"></td>'+
      '<td class="rltv2-review-creci">'+esc(r.creci||'')+'</td>'+
      '<td class="rltv2-review-manager">'+esc(r.gerente||'')+'</td>'+
      '<td class="rltv2-review-director">'+esc(r.diretor||'')+'</td>'+
      '<td class="rltv2-review-status">'+esc(r.status_creci||'')+'</td>'+
      (group==='salao'?'<td></td>':'<td><button type="button" class="rltv2-remove-row">Remover</button></td>')+
    '</tr>';
  }

  function reviewGroupHtml(title,group,rows,allowAdd){
    const ordered=group==='salao'?[...rows].sort((a,b)=>Number(a.ordem_final)-Number(b.ordem_final)):[...rows];
    return '<section class="rltv2-review-group" data-review-group="'+group+'">'+
      '<div class="rltv2-review-group-head"><strong>'+title+'</strong>'+
      (allowAdd?'<button type="button" class="rltv2-add-row" data-add-group="'+group+'">Adicionar '+title+'</button>':'')+
      '</div>'+
      '<div class="rltv2-review-wrap"><table class="rltv2-review-table">'+
      '<thead><tr><th>Posição</th><th>Nome</th><th>CRECI</th><th>Gerente</th><th>Diretor</th><th>Status</th><th></th></tr></thead>'+
      '<tbody>'+ordered.map((r,i)=>reviewRowHtml(r,group,i,ordered.length)).join('')+'</tbody>'+
      '</table></div></section>';
  }

  function reviewRowsHtml(p,brokers){
    const options=brokers.map(b=>'<option value="'+esc(b.nome)+'"></option>').join('');
    return '<datalist id="rltv2BrokerNames">'+options+'</datalist>'+
      reviewGroupHtml('SALÃO','salao',p.salao,false)+
      reviewGroupHtml('STAND BY','standby',p.standby,true)+
      reviewGroupHtml('ON-LINE','online',p.online,true);
  }

  function applyHumanReview(base,reviewHost,brokers){
    const lookup=new Map(brokers.map(b=>[normalizeName(b.nome),b]));
    const p=clonePayload(base),errors=[],corrections=[];

    function readGroup(group){
      const rows=[...reviewHost.querySelectorAll('tr[data-group="'+group+'"]')];
      const reviewed=rows.map((tr,index)=>{
        const pos=Number(tr.querySelector('.rltv2-review-position').value);
        const typed=String(tr.querySelector('.rltv2-review-name').value||'').trim();
        const broker=lookup.get(normalizeName(typed));
        if(!Number.isInteger(pos)||pos<1||pos>Math.max(rows.length,1))errors.push(group.toUpperCase()+' linha '+(index+1)+': posição inválida.');
        if(!broker)errors.push(group.toUpperCase()+' linha '+(index+1)+': corretor "'+typed+'" não consta no cadastro oficial.');
        const originalPos=Number(tr.dataset.originalPosition),originalName=tr.dataset.originalName||'';
        if(pos!==originalPos||normalizeName(typed)!==normalizeName(originalName)){
          corrections.push(group+' p'+originalPos+' '+originalName+' → p'+pos+' '+(broker?.nome||typed));
        }
        if(!broker)return null;
        const out={nome:broker.nome,creci:broker.creci,status_creci:broker.status_creci,gerente:broker.gerente,diretor:broker.diretor};
        if(group==='salao')out.ordem_final=pos;
        else out.__review_position=pos;
        return out;
      }).filter(Boolean);
      const orders=reviewed.map(r=>group==='salao'?r.ordem_final:r.__review_position).sort((a,b)=>a-b);
      for(let i=0;i<orders.length;i++)if(orders[i]!==i+1){errors.push(group.toUpperCase()+' deve formar sequência única de 1 a '+orders.length+'.');break}
      return reviewed.sort((a,b)=>(group==='salao'?a.ordem_final:a.__review_position)-(group==='salao'?b.ordem_final:b.__review_position)).map(r=>{if(group!=='salao')delete r.__review_position;return r});
    }

    p.salao=readGroup('salao');
    p.standby=readGroup('standby');
    p.online=readGroup('online');
    if(errors.length)return {errors:[...new Set(errors)],payload:null,corrections};
    p.evento.tegra_qtd=p.salao.length;
    const validationErrors=validatePayload(p);
    return {errors:validationErrors,payload:validationErrors.length?null:p,corrections};
  }

  function mount(host){
    let payload=null,reviewedPayload=null,brokers=[];
    host.innerHTML=
      '<div class="workspace-page-head"><div><span class="eyebrow">RLT-PRINT-V2</span><h2>Gerador canônico</h2><p>JSON é transcrição inicial. A impressão só é liberada após <strong>conferência humana das posições e nomes</strong>.</p></div></div>'+
      '<article class="card rltv2-import-card">'+
        '<div class="section-head"><div><span class="eyebrow">1 · IMPORTAÇÃO</span><h2>Importar JSON da Skill</h2></div><span class="intake-risk">TRANSCRIÇÃO INICIAL</span></div>'+
        '<textarea id="rltv2Json" class="rltv2-json" rows="16" spellcheck="false" placeholder="{ ... JSON da Skill ... }"></textarea>'+
        '<div class="intake-actions"><button id="rltv2Paste" class="simulation-run">Colar JSON</button><label class="rltv2-file"><input id="rltv2File" type="file" accept="application/json,.json">Carregar .json</label><button id="rltv2Validate" class="simulation-run">Carregar para conferência</button></div>'+
        '<div id="rltv2Gate" class="intake-gate blocked"><strong>AGUARDANDO DADOS</strong></div>'+
      '</article>'+
      '<article id="rltv2ReviewCard" class="card rltv2-review-card" hidden>'+
        '<div class="section-head"><div><span class="eyebrow">2 · CONFERÊNCIA HUMANA</span><h2>Validar SALÃO, STAND BY e ON-LINE</h2></div><span id="rltv2ReviewCount" class="intake-counts"></span></div>'+
        '<p class="small muted">Compare todos os blocos com a folha manuscrita. Corrija posição/nome e adicione ou remova STAND BY e ON-LINE quando a transcrição tiver omitido alguém. Os dados cadastrais são atualizados pelo cadastro oficial.</p>'+
        '<div class="rltv2-company-review">'+
          '<label><span>Quantidade HELBOR</span><input id="rltv2HelborQtd" type="number" min="0" inputmode="numeric"></label>'+
          '<label><span>Regra do sorteio</span><select id="rltv2ShareMode"><option value="tegra_share">Share Tegra</option><option value="none">Sem share</option><option value="helbor_share">Share Helbor</option></select></label>'+
          '<label id="rltv2PrimaryWrap"><span id="rltv2PrimaryLabel">Posição HELBOR</span><select id="rltv2PrimaryPosition"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>'+
          '<label id="rltv2SecondaryWrap" hidden><span>Posição HELBOR</span><select id="rltv2SecondaryPosition"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>'+
          '<div class="rltv2-company-derived"><span>Resultado</span><strong id="rltv2CompanyDerived">—</strong></div>'+
        '</div>'+
        '<div id="rltv2Review"></div>'+
        '<div class="intake-actions"><button id="rltv2ApplyReview" class="simulation-run">Aplicar correções e validar</button></div>'+
        '<div id="rltv2ReviewGate" class="intake-gate blocked"><strong>CONFERÊNCIA PENDENTE</strong><div>Revise as linhas antes de liberar a prévia final.</div></div>'+
      '</article>'+
      '<article id="rltv2PreviewCard" class="card rltv2-preview-card" hidden>'+
        '<div class="section-head"><div><span class="eyebrow">3 · PRÉVIA FINAL</span><h2>RLT-PRINT-V2</h2></div><span id="rltv2Counts" class="intake-counts"></span></div>'+
        '<div id="rltv2Preview" class="rltv2-screen-preview"></div>'+
        '<label class="intake-confirm"><input id="rltv2Confirm" type="checkbox"> Conferi a folha final após as correções humanas.</label>'+
        '<div class="intake-actions"><button id="rltv2Print" class="simulation-run" disabled>4 · Abrir PDF para imprimir</button><button id="rltv2SavePdf" class="simulation-run" disabled>Salvar PDF</button><button id="rltv2SharePdf" class="simulation-run" disabled>Compartilhar</button></div>'+
        '<p id="rltv2PdfStatus" class="small muted" role="status" aria-live="polite">Confirme a folha final para preparar o PDF de compartilhamento.</p>'+
      '</article>'+
      '<section id="rltv2PrintHost" class="roulette-print-sheet" hidden></section>';

    if(window.RoletaGeminiDraftUI)window.RoletaGeminiDraftUI.mount(host);

    const ta=host.querySelector('#rltv2Json');
    const file=host.querySelector('#rltv2File');
    const paste=host.querySelector('#rltv2Paste');
    const btn=host.querySelector('#rltv2Validate');
    const gate=host.querySelector('#rltv2Gate');
    const reviewCard=host.querySelector('#rltv2ReviewCard');
    const reviewHost=host.querySelector('#rltv2Review');
    const reviewCount=host.querySelector('#rltv2ReviewCount');
    const reviewBtn=host.querySelector('#rltv2ApplyReview');
    const reviewGate=host.querySelector('#rltv2ReviewGate');
    const helborQtd=host.querySelector('#rltv2HelborQtd');
    const shareMode=host.querySelector('#rltv2ShareMode');
    const primaryPosition=host.querySelector('#rltv2PrimaryPosition');
    const secondaryPosition=host.querySelector('#rltv2SecondaryPosition');
    const primaryLabel=host.querySelector('#rltv2PrimaryLabel');
    const secondaryWrap=host.querySelector('#rltv2SecondaryWrap');
    const companyDerived=host.querySelector('#rltv2CompanyDerived');
    const card=host.querySelector('#rltv2PreviewCard');
    const preview=host.querySelector('#rltv2Preview');
    const counts=host.querySelector('#rltv2Counts');
    const confirm=host.querySelector('#rltv2Confirm');
    const print=host.querySelector('#rltv2Print');
    const savePdf=host.querySelector('#rltv2SavePdf');
    const sharePdf=host.querySelector('#rltv2SharePdf');
    const pdfStatus=host.querySelector('#rltv2PdfStatus');
    let pdfBlob=null,pdfVersion=0;
    const printHost=host.querySelector('#rltv2PrintHost');

    loadBrokerDirectory().then(x=>{brokers=x}).catch(err=>{
      gate.className='intake-gate blocked';
      gate.innerHTML='<strong>CADASTRO INDISPONÍVEL</strong><div>'+esc(err.message||err)+'</div>';
    });

    file.addEventListener('change',async()=>{
      const f=file.files&&file.files[0]; if(!f)return;
      ta.value=await f.text();
    });

    function invalidateFinal(){
      reviewedPayload=null;pdfBlob=null;pdfVersion++;card.hidden=true;confirm.checked=false;print.disabled=true;savePdf.disabled=true;sharePdf.disabled=true;
      reviewGate.className='intake-gate blocked';
      reviewGate.innerHTML='<strong>ALTERAÇÕES PENDENTES</strong><div>Clique em Aplicar correções e validar antes da impressão.</div>';
    }

    function refreshCompanyDraw(){
      const mode=shareMode.value;
      secondaryWrap.hidden=mode!=='none';
      primaryLabel.textContent=mode==='tegra_share'?'Posição HELBOR':(mode==='helbor_share'?'Posição TEGRA':'Posição TEGRA');
      const draw=deriveCompanyDraw(mode,primaryPosition.value,secondaryPosition.value);
      companyDerived.textContent=draw?('TG '+draw.tegra_positions.join(' - ')+' | HB '+draw.helbor_positions.join(' - ')):'Seleção inválida';
      return draw;
    }

    function seedCompanyControls(p){
      helborQtd.value=String(Number(p.evento?.helbor_qtd)||0);
      const d=p.evento?.company_draw;
      if(d&&['tegra_share','none','helbor_share'].includes(d.mode)){
        shareMode.value=d.mode;
        if(d.mode==='tegra_share')primaryPosition.value=String(d.helbor_positions?.[0]||1);
        else if(d.mode==='helbor_share')primaryPosition.value=String(d.tegra_positions?.[0]||1);
        else{
          primaryPosition.value=String(d.tegra_positions?.[0]||1);
          secondaryPosition.value=String(d.helbor_positions?.[0]||2);
        }
      }else{
        // Safe default for the current operational pattern; human review remains mandatory.
        shareMode.value='tegra_share';
        primaryPosition.value='1';
        secondaryPosition.value='2';
      }
      refreshCompanyDraw();
    }

    function applyReviewState(){
      const result=applyHumanReview(payload,reviewHost,brokers);
      if(result.errors.length||!result.payload)return result;
      const qtd=Number(helborQtd.value);
      const draw=refreshCompanyDraw();
      const extra=[];
      if(!Number.isInteger(qtd)||qtd<0)extra.push('Quantidade HELBOR inválida.');
      if(!draw)extra.push('Sorteio de empresa inválido.');
      if(extra.length)return {errors:extra,payload:null,corrections:result.corrections};
      result.payload.evento.helbor_qtd=qtd;
      result.payload.evento.company_draw=draw;
      result.payload.evento.sorteio_empresa={
        tg:draw.tegra_positions.join(' - '),
        hb:draw.helbor_positions.join(' - ')
      };
      return result;
    }

    function bindReviewControls(scope){
      scope.querySelectorAll('input').forEach(input=>{
        const onEdit=()=>{
          const tr=input.closest('tr');
          if(input.classList.contains('rltv2-review-name')){
            const broker=brokers.find(b=>normalizeName(b.nome)===normalizeName(input.value));
            if(broker){
              input.value=broker.nome;
              tr.querySelector('.rltv2-review-creci').textContent=broker.creci;
              tr.querySelector('.rltv2-review-manager').textContent=broker.gerente;
              tr.querySelector('.rltv2-review-director').textContent=broker.diretor;
              tr.querySelector('.rltv2-review-status').textContent=broker.status_creci;
            }
          }
          invalidateFinal();
        };
        input.addEventListener('input',onEdit);
        input.addEventListener('change',onEdit);
      });
      scope.querySelectorAll('.rltv2-remove-row').forEach(button=>button.addEventListener('click',()=>{
        const tbody=button.closest('tbody');
        button.closest('tr').remove();
        [...tbody.querySelectorAll('tr')].forEach((tr,i)=>{
          const pos=tr.querySelector('.rltv2-review-position');
          pos.value=String(i+1);pos.max=String(tbody.querySelectorAll('tr').length);
        });
        invalidateFinal();
      }));
    }

    async function validateAndPrepareReview(){
      reviewCard.hidden=true;card.hidden=true;confirm.checked=false;print.disabled=true;savePdf.disabled=true;payload=null;reviewedPayload=null;
      try{
        if(!brokers.length)brokers=await loadBrokerDirectory();
        const p=normalizePayload(ta.value);
        const errors=validatePayload(p);
        if(errors.length){
          gate.className='intake-gate blocked';
          gate.innerHTML='<strong>IMPORTAÇÃO BLOQUEADA</strong>'+errors.map(x=>'<div>• '+esc(x)+'</div>').join('');
          return;
        }
        payload=p;
        gate.className='intake-gate clear';
        gate.innerHTML='<strong>JSON CARREGADO</strong><div>Agora faça a conferência humana de posição e nome. A impressão ainda está bloqueada.</div>';
        reviewCount.textContent=(p.salao.length+p.standby.length+p.online.length)+' linhas carregadas';
        reviewHost.innerHTML=reviewRowsHtml(p,brokers);
        seedCompanyControls(p);
        reviewCard.hidden=false;
        reviewGate.className='intake-gate blocked';
        reviewGate.innerHTML='<strong>CONFERÊNCIA PENDENTE</strong><div>Compare SALÃO, STAND BY e ON-LINE com a folha original.</div>';
        bindReviewControls(reviewHost);
        [helborQtd,shareMode,primaryPosition,secondaryPosition].forEach(control=>{
          control.addEventListener('input',()=>{refreshCompanyDraw();invalidateFinal()});
          control.addEventListener('change',()=>{refreshCompanyDraw();invalidateFinal()});
        });
        reviewHost.querySelectorAll('.rltv2-add-row').forEach(button=>button.addEventListener('click',()=>{
          const group=button.dataset.addGroup;
          const section=reviewHost.querySelector('[data-review-group="'+group+'"]');
          const tbody=section.querySelector('tbody');
          const index=tbody.querySelectorAll('tr').length;
          const temp={nome:'',creci:'',gerente:'',diretor:'',status_creci:''};
          tbody.insertAdjacentHTML('beforeend',reviewRowHtml(temp,group,index,index+1));
          const row=tbody.lastElementChild;
          row.dataset.originalPosition=String(index+1);
          row.dataset.originalName='';
          bindReviewControls(row);
          invalidateFinal();
        }));
        reviewCard.scrollIntoView({behavior:'smooth',block:'start'});
      }catch(err){
        gate.className='intake-gate blocked';
        gate.innerHTML='<strong>JSON INVÁLIDO</strong><div>'+esc(err.message||err)+'</div>';
      }
    }

    paste.addEventListener('click',async()=>{
      try{
        if(!navigator.clipboard||!navigator.clipboard.readText)throw new Error('Leitura da área de transferência não está disponível neste navegador.');
        const text=await navigator.clipboard.readText();
        if(!text.trim())throw new Error('A área de transferência está vazia.');
        ta.value=text.trim();
        await validateAndPrepareReview();
      }catch(err){
        gate.className='intake-gate blocked';
        gate.innerHTML='<strong>NÃO FOI POSSÍVEL COLAR</strong><div>'+esc(err.message||err)+'</div><div>Use Ctrl+V no campo ou permita acesso à área de transferência e tente novamente.</div>';
      }
    });

    btn.addEventListener('click',validateAndPrepareReview);

    reviewBtn.addEventListener('click',()=>{
      if(!payload)return;
      const result=applyReviewState();
      if(result.errors.length){
        reviewGate.className='intake-gate blocked';
        reviewGate.innerHTML='<strong>CONFERÊNCIA BLOQUEADA</strong>'+result.errors.map(x=>'<div>• '+esc(x)+'</div>').join('');
        reviewedPayload=null;card.hidden=true;return;
      }
      reviewedPayload=result.payload;
      pdfBlob=null;pdfVersion++;print.disabled=true;sharePdf.disabled=true;pdfStatus.textContent='Confirme a folha final para preparar o PDF.';
      reviewGate.className='intake-gate clear';
      reviewGate.innerHTML='<strong>CONFERÊNCIA HUMANA VALIDADA</strong>'+
        (result.corrections.length?'<div>Correções aplicadas:</div>'+result.corrections.map(x=>'<div>• '+esc(x)+'</div>').join(''):'<div>Nenhuma alteração necessária; transcrição confirmada.</div>');
      counts.innerHTML=previewSummary(reviewedPayload);
      renderCanonical(preview,reviewedPayload);
      card.hidden=false;confirm.checked=false;print.disabled=true;savePdf.disabled=true;sharePdf.disabled=true;
      card.scrollIntoView({behavior:'smooth',block:'start'});
    });

    function pdfFilename(){
      const e=reviewedPayload.evento;
      return 'Roleta-'+String(e.data).split('/').join('-')+'-'+String(e.periodo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()+'.pdf';
    }
    async function preparePdf(version){
      try{
        const auth=await fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.json());
        if(!auth.authenticated||!auth.csrfToken)throw Error('Entre com Google para gerar e compartilhar o PDF.');
        const response=await fetch('/api/roleta-pdf',{
          method:'POST',
          headers:{'Content-Type':'application/json','X-Roleta-CSRF':auth.csrfToken},
          body:JSON.stringify(reviewedPayload),
          cache:'no-store'
        });
        if(!response.ok){
          const data=await response.json().catch(()=>({}));
          throw Error(data.error||'Não foi possível gerar o PDF.');
        }
        const blob=await response.blob();
        if(blob.type!=='application/pdf'||blob.size<100)throw Error('Arquivo PDF inválido.');
        if(version!==pdfVersion||!confirm.checked)return;
        pdfBlob=blob;
        print.disabled=false;
        savePdf.disabled=false;
        sharePdf.disabled=false;
        pdfStatus.textContent='PDF pronto para salvar ou compartilhar no WhatsApp.';
      }catch(error){
        if(version!==pdfVersion)return;
        pdfBlob=null;print.disabled=true;savePdf.disabled=true;sharePdf.disabled=true;
        pdfStatus.textContent=String(error.message||error);
      }
    }
    confirm.addEventListener('change',()=>{
      pdfVersion++;
      pdfBlob=null;
      print.disabled=true;
      savePdf.disabled=true;sharePdf.disabled=true;
      if(confirm.checked&&reviewedPayload){
        pdfStatus.textContent='Gerando PDF...';
        preparePdf(pdfVersion);
      }else pdfStatus.textContent='Confirme a folha final para preparar o PDF.';
    });
    function saveReadyPdf(){
      if(!confirm.checked||!pdfBlob)return;
      const url=URL.createObjectURL(pdfBlob);
      const a=document.createElement('a');a.href=url;a.download=pdfFilename();
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
    function shareReadyPdf(){
      if(!confirm.checked||!pdfBlob)return;
      const file=new File([pdfBlob],pdfFilename(),{type:'application/pdf'});
      // Invoke share directly on the user gesture; async fetch here breaks iOS activation.
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:'Roleta '+reviewedPayload.evento.data})
          .catch(e=>{if(e.name!=='AbortError')pdfStatus.textContent='Não foi possível compartilhar. Use Salvar PDF.';});
      }else{
        pdfStatus.textContent='O compartilhamento de arquivos não está disponível neste navegador. Use Salvar PDF e envie pelo WhatsApp.';
      }
    }
    function openPrintDialog(){
      // The same PDF bytes are used for print, save and WhatsApp share.
      // On iOS PWAs the native PDF viewer is more reliable than browser page printing.
      if(!confirm.checked||!pdfBlob)return;
      const url=URL.createObjectURL(pdfBlob);
      const popup=window.open(url,'_blank');
      if(!popup){
        const a=document.createElement('a');
        a.href=url;a.target='_blank';a.rel='noopener';a.click();
        pdfStatus.textContent='PDF aberto para impressão. Use a opção Imprimir do visualizador.';
      }else{
        pdfStatus.textContent='Use a opção Imprimir do visualizador do PDF.';
      }
      setTimeout(()=>URL.revokeObjectURL(url),120000);
    }
    print.addEventListener('click',openPrintDialog);
    savePdf.addEventListener('click',saveReadyPdf);
    sharePdf.addEventListener('click',shareReadyPdf);
  }

  window.RouletteIntake={mount,normalizePayload,validatePayload,renderCanonical,applyHumanReview,deriveCompanyDraw};
})();