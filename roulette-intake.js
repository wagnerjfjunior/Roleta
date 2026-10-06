(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function normalizePayload(input){
    const p=typeof input==='string'?JSON.parse(input):input;
    if(!p||typeof p!=='object')throw new Error('JSON inválido.');
    p.standby=Array.isArray(p.standby)?p.standby:[];
    p.online=Array.isArray(p.online)?p.online:[];
    p.salao=Array.isArray(p.salao)?p.salao:[];
    return p;
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
    const tg='TG '+String(e.sorteio_empresa.tg).replace(/^TG\s*/i,'').trim();
    const hb='HB '+String(e.sorteio_empresa.hb).replace(/^HB\s*/i,'').trim();
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
          '<span class="c6 rltv2-company-split"><b>'+esc(tg)+'</b><b>'+esc(hb)+'</b></span>'+
        '</div>'+
        section(p.salao,'',true)+
        section(p.standby,'STAND-BY',false)+
        section(p.online,'ON-LINE',false)+
      '</div>';
  }

  function previewSummary(p){
    const e=p.evento;
    return '<div class="rltv2-summary">'+
      '<span><b>SALÃO</b> '+p.salao.length+'</span>'+
      '<span><b>STAND-BY</b> '+p.standby.length+'</span>'+
      '<span><b>ON-LINE</b> '+p.online.length+'</span>'+
      '<span><b>HELBOR</b> '+esc(e.helbor_qtd)+'</span>'+
      '<span><b>SORTEIO</b> TG '+esc(e.sorteio_empresa.tg)+' | HB '+esc(e.sorteio_empresa.hb)+'</span>'+
    '</div>';
  }

  function mount(host){
    let payload=null;
    host.innerHTML=
      '<div class="workspace-page-head"><div><span class="eyebrow">RLT-PRINT-V2</span><h2>Gerador canônico</h2><p>Copie o JSON da Skill e clique em <strong>Colar JSON</strong>. O APP cola, valida e monta a prévia automaticamente.</p></div></div>'+
      '<article class="card rltv2-import-card">'+
        '<div class="section-head"><div><span class="eyebrow">1 · DADOS VALIDADOS</span><h2>Importar JSON da Skill</h2></div><span class="intake-risk">LAYOUT DETERMINÍSTICO</span></div>'+
        '<textarea id="rltv2Json" class="rltv2-json" rows="16" spellcheck="false" placeholder="{ ... JSON VALIDADO da Skill ... }"></textarea>'+
        '<div class="intake-actions"><button id="rltv2Paste" class="simulation-run">Colar JSON</button><label class="rltv2-file"><input id="rltv2File" type="file" accept="application/json,.json">Carregar .json</label><button id="rltv2Validate" class="simulation-run">Validar e montar prévia</button></div>'+
        '<div id="rltv2Gate" class="intake-gate blocked"><strong>AGUARDANDO DADOS</strong></div>'+
      '</article>'+
      '<article id="rltv2PreviewCard" class="card rltv2-preview-card" hidden>'+
        '<div class="section-head"><div><span class="eyebrow">2 · PRÉVIA</span><h2>RLT-PRINT-V2</h2></div><span id="rltv2Counts" class="intake-counts"></span></div>'+
        '<div id="rltv2Preview" class="rltv2-screen-preview"></div>'+
        '<label class="intake-confirm"><input id="rltv2Confirm" type="checkbox"> Conferi o cabeçalho, os 6 campos da tabela e os blocos condicionais.</label>'+
        '<div class="intake-actions"><button id="rltv2Print" class="simulation-run" disabled>Imprimir roleta final</button></div>'+
      '</article>'+
      '<section id="rltv2PrintHost" class="roulette-print-sheet" hidden></section>';

    const ta=host.querySelector('#rltv2Json');
    const file=host.querySelector('#rltv2File');
    const paste=host.querySelector('#rltv2Paste');
    const btn=host.querySelector('#rltv2Validate');
    const gate=host.querySelector('#rltv2Gate');
    const card=host.querySelector('#rltv2PreviewCard');
    const preview=host.querySelector('#rltv2Preview');
    const counts=host.querySelector('#rltv2Counts');
    const confirm=host.querySelector('#rltv2Confirm');
    const print=host.querySelector('#rltv2Print');
    const printHost=host.querySelector('#rltv2PrintHost');

    file.addEventListener('change',async()=>{
      const f=file.files&&file.files[0]; if(!f)return;
      ta.value=await f.text();
    });

    function validateAndRender(){
      card.hidden=true; confirm.checked=false; print.disabled=true; payload=null;
      try{
        const p=normalizePayload(ta.value);
        const errors=validatePayload(p);
        if(errors.length){
          gate.className='intake-gate blocked';
          gate.innerHTML='<strong>IMPRESSÃO BLOQUEADA</strong>'+errors.map(x=>'<div>• '+esc(x)+'</div>').join('');
          return;
        }
        payload=p;
        gate.className='intake-gate clear';
        gate.innerHTML='<strong>DADOS VÁLIDOS</strong><div>Contrato RLT-PRINT-V2 atendido. Faça a conferência visual final.</div>';
        counts.innerHTML=previewSummary(p);
        renderCanonical(preview,p);
        card.hidden=false;
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
        validateAndRender();
      }catch(err){
        gate.className='intake-gate blocked';
        gate.innerHTML='<strong>NÃO FOI POSSÍVEL COLAR</strong><div>'+esc(err.message||err)+'</div><div>Use Ctrl+V no campo ou permita acesso à área de transferência e tente novamente.</div>';
      }
    });

    btn.addEventListener('click',validateAndRender);

    confirm.addEventListener('change',()=>{print.disabled=!confirm.checked||!payload});
    print.addEventListener('click',()=>{
      if(!payload)return;
      renderCanonical(printHost,payload);
      printHost.hidden=false;
      setTimeout(()=>window.print(),50);
    });
  }

  window.RouletteIntake={mount,validatePayload,renderCanonical};
})();