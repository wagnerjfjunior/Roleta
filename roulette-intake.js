(function(){
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

  function levenshtein(a,b){
    a=norm(a);b=norm(b);
    if(!a)return b.length;if(!b)return a.length;
    const prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let diag=prev[0],left=i;prev[0]=i;
      for(let j=1;j<=b.length;j++){
        const up=prev[j],cost=a[i-1]===b[j-1]?0:1;
        const val=Math.min(up+1,left+1,diag+cost);
        diag=up;prev[j]=val;left=val;
      }
    }
    return prev[b.length];
  }

  function closest(raw,brokers,limit=3){
    return [...brokers].map(b=>({name:b['Nome Comercial'],d:levenshtein(raw,b['Nome Comercial'])}))
      .sort((a,b)=>a.d-b.d||a.name.localeCompare(b.name)).slice(0,limit).map(x=>x.name);
  }

  function canonicalRow(raw,brokers,aliases){
    const original=raw.raw_name||'';
    const alias=aliases[original]||original;
    let broker=brokers.find(b=>norm(b['Nome Comercial'])===norm(alias));
    const candidates=(raw.candidate_names||[]).filter(Boolean);
    if(!broker&&candidates.length===1){
      broker=brokers.find(b=>norm(b['Nome Comercial'])===norm(candidates[0]));
    }
    const suggestions=[...new Set([...candidates,...closest(original,brokers,3)])].slice(0,3);
    return {...raw,canonical_name:broker?.['Nome Comercial']||'',broker,suggestions,confirmed_historical:false};
  }

  function compressImage(file){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{
        try{
          const max=1800,scale=Math.min(1,max/Math.max(img.width,img.height));
          const canvas=document.createElement('canvas');
          canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/jpeg',0.84));
        }catch(e){reject(e)}
      };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível ler a imagem.'))};
      img.src=url;
    });
  }

  function dayFromBR(date){
    const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date||'');
    if(!m)return '';
    const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
    return ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'][d.getDay()];
  }

  function validate(state){
    const errors=[];
    const salao=state.rows.filter(r=>r.participation_class==='salao');
    if(!salao.length)errors.push('Nenhum corretor classificado como SALÃO.');
    const numbers=salao.map(r=>Number(r.drawn_number)).filter(Number.isInteger);
    if(numbers.length!==salao.length)errors.push('Todo corretor de SALÃO precisa ter número sorteado.');
    const N=salao.length;
    const expected=Array.from({length:N},(_,i)=>i+1);
    const sorted=[...numbers].sort((a,b)=>a-b);
    if(sorted.length===N&&expected.some((v,i)=>sorted[i]!==v))errors.push('Os números sorteados do SALÃO não formam uma permutação completa de 1..N.');
    state.rows.forEach(r=>{
      if(!r.canonical_name&&!r.confirmed_historical)errors.push('Nome não validado na posição '+r.physical_position+': '+(r.raw_name||'ilegível'));
      if(r.participation_class==='unknown')errors.push('Classificação indefinida na posição '+r.physical_position+'.');
    });
    const m=state.metadata;
    if(!m.empreendimento)errors.push('Empreendimento não confirmado.');
    if(!m.data)errors.push('Data não confirmada.');
    if(!m.periodo)errors.push('Período não confirmado.');
    if(!m.tg_draw||!m.hb_draw)errors.push('Sorteio das empresas não confirmado.');
    return errors;
  }

  function brokerFields(r){
    const b=r.broker||{};
    return {
      name:r.canonical_name||r.raw_name||'—',
      creci:b['CRECI']||'—',
      gerente:b['Equipe']||r.manager_raw||'—',
      diretor:b['Diretor']||'—',
      status:b['Tipo CRECI']||'—'
    };
  }

  function renderPrintSheet(host,state){
    const groups={salao:[],standby:[],online:[]};
    state.rows.forEach(r=>{if(groups[r.participation_class])groups[r.participation_class].push(r)});
    const salao=[...groups.salao].sort((a,b)=>Number(a.drawn_number)-Number(b.drawn_number));
    const standby=[...groups.standby].sort((a,b)=>a.physical_position-b.physical_position);
    const online=[...groups.online].sort((a,b)=>a.physical_position-b.physical_position);

    const rowHtml=(r,index)=>{const f=brokerFields(r);return '<div class="print-grid print-row '+(index%2?'shade':'')+'">'+
      '<span>'+ (r.participation_class==='salao'?r.drawn_number:index+1) +'</span>'+
      '<span>'+f.name+'</span><span>'+f.creci+'</span><span>'+f.gerente+'</span><span>'+f.diretor+'</span><span>'+f.status+'</span></div>'};

    const table=(rows,title)=>!rows.length?'':(title?'<div class="print-section">'+title+'</div>':'')+
      '<div class="print-grid print-head"><span>Nº</span><span>CORRETOR (A)</span><span>CRECI</span><span>GERENTE</span><span>DIRETOR</span><span>STATUS CRECI</span></div>'+
      rows.map(rowHtml).join('');

    host.innerHTML=
      '<div class="print-grid print-company-label"><span>SORTEIO EMPRESA</span></div>'+
      '<div class="print-grid print-company-values"><span>'+state.metadata.tg_draw+'</span><span>'+state.metadata.hb_draw+'</span></div>'+
      '<div class="print-grid print-meta-label"><span>EMPREENDIMENTO</span><span>DATA</span><span>TEGRA</span><span>PERÍODO</span></div>'+
      '<div class="print-grid print-meta-values"><span>'+state.metadata.empreendimento+'</span><span>'+state.metadata.data+'</span><span>'+(state.metadata.dia_semana||dayFromBR(state.metadata.data))+'</span><span>'+state.metadata.periodo+'</span></div>'+
      table(salao,'')+table(standby,'STAND-BY')+table(online,'ON-LINE');
  }

  function mount(host){
    let brokers=[],aliases={},analysis=null,imageDataUrl='';
    host.innerHTML=
      '<div class="workspace-page-head"><div><span class="eyebrow">OPERAÇÃO</span><h2>Nova Roleta</h2><p>Upload → prévia → validação → impressão. Nenhuma impressão é liberada com pendência.</p></div></div>'+
      '<article class="card intake-upload-card"><div class="section-head"><div><span class="eyebrow">1 · UPLOAD</span><h2>Folha do sorteio</h2></div><span class="intake-risk">VALIDAÇÃO OBRIGATÓRIA</span></div>'+
      '<label class="intake-drop"><input id="roulettePhotoInput" type="file" accept="image/*" capture="environment"><strong>Tirar foto ou escolher imagem</strong><span>Use a folha inteira, reta e com boa iluminação.</span></label>'+
      '<img id="roulettePhotoPreview" class="intake-photo-preview" alt="Prévia da folha" hidden>'+
      '<div class="intake-actions"><button id="analyzeRoulette" class="simulation-run" disabled>Analisar folha</button><span id="rouletteAnalyzeStatus" class="muted small">Aguardando foto.</span></div></article>'+
      '<div id="rouletteValidationArea"></div>'+
      '<section id="roulettePrintSheet" class="roulette-print-sheet" hidden></section>';

    const input=host.querySelector('#roulettePhotoInput');
    const preview=host.querySelector('#roulettePhotoPreview');
    const analyze=host.querySelector('#analyzeRoulette');
    const status=host.querySelector('#rouletteAnalyzeStatus');
    const area=host.querySelector('#rouletteValidationArea');
    const printSheet=host.querySelector('#roulettePrintSheet');

    Promise.all([
      fetch('/data/brokers-official.csv',{cache:'no-store'}).then(r=>r.text()),
      fetch('/data/broker-name-aliases.json',{cache:'no-store'}).then(r=>r.json())
    ]).then(([csv,a])=>{brokers=parseCSV(csv);aliases=a.aliases||{}}).catch(()=>{});

    input.addEventListener('change',async()=>{
      const file=input.files&&input.files[0];
      analysis=null;area.innerHTML='';printSheet.hidden=true;
      if(!file){analyze.disabled=true;status.textContent='Aguardando foto.';return}
      status.textContent='Preparando imagem…';analyze.disabled=true;
      try{
        imageDataUrl=await compressImage(file);
        preview.src=imageDataUrl;preview.hidden=false;
        analyze.disabled=false;status.textContent='Foto pronta para análise.';
      }catch(e){status.textContent=e.message||'Falha ao preparar imagem.'}
    });

    analyze.addEventListener('click',async()=>{
      if(!imageDataUrl)return;
      analyze.disabled=true;status.textContent='Analisando escrita, barra e números…';
      try{
        const r=await fetch('/api/analyze-roulette',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageDataUrl})});
        const data=await r.json();
        if(!r.ok)throw new Error(data.detail||data.error||'Falha na análise');
        analysis={
          metadata:{...data.metadata,dia_semana:data.metadata.dia_semana||dayFromBR(data.metadata.data)},
          cutoff:data.cutoff,
          warnings:data.warnings||[],
          rows:(data.rows||[]).map(x=>canonicalRow(x,brokers,aliases))
        };
        renderValidation();
        status.textContent='Prévia criada. Revise todas as pendências.';
      }catch(e){
        status.textContent='Erro: '+(e.message||e);
      }finally{analyze.disabled=false}
    });

    function renderValidation(){
      if(!analysis)return;
      const counts=cls=>analysis.rows.filter(r=>r.participation_class===cls).length;
      const meta=analysis.metadata;
      area.innerHTML=
        '<article class="card intake-preview-card"><div class="section-head"><div><span class="eyebrow">2 · PRÉVIA</span><h2>Validação humana</h2></div>'+
        '<span class="intake-counts">SALÃO '+counts('salao')+' · STAND-BY '+counts('standby')+' · ON-LINE '+counts('online')+'</span></div>'+
        '<div class="intake-meta-grid">'+
          '<label><span>Empreendimento</span><input data-meta="empreendimento" value="'+esc(meta.empreendimento)+'"></label>'+
          '<label><span>Data</span><input data-meta="data" value="'+esc(meta.data)+'"></label>'+
          '<label><span>Dia</span><input data-meta="dia_semana" value="'+esc(meta.dia_semana)+'"></label>'+
          '<label><span>Período</span><input data-meta="periodo" value="'+esc(meta.periodo)+'"></label>'+
          '<label><span>Sorteio TG</span><input data-meta="tg_draw" value="'+esc(meta.tg_draw)+'" placeholder="TG 2 - 3"></label>'+
          '<label><span>Sorteio HB</span><input data-meta="hb_draw" value="'+esc(meta.hb_draw)+'" placeholder="HB 01"></label>'+
        '</div>'+
        '<div class="intake-cutoff">'+(analysis.cutoff.detected?'Barra detectada após posição '+(analysis.cutoff.after_physical_position??'—'):'⚠ Barra não confirmada')+' · confiança '+analysis.cutoff.confidence+'</div>'+
        (analysis.warnings.length?'<div class="intake-warnings">'+analysis.warnings.map(w=>'<div>⚠ '+esc(w)+'</div>').join('')+'</div>':'')+
        '<div class="intake-table-wrap"><table class="intake-table"><thead><tr><th>Pos.</th><th>Nome lido / validado</th><th>Nº sorteado</th><th>Classe</th><th>Cadastro</th></tr></thead><tbody>'+
        analysis.rows.sort((a,b)=>a.physical_position-b.physical_position).map((row,i)=>rowEditor(row,i)).join('')+
        '</tbody></table></div>'+
        '<div id="rouletteGate" class="intake-gate"></div>'+
        '<label class="intake-confirm"><input id="rouletteHumanConfirm" type="checkbox"> Conferi nomes, classificação, números sorteados e metadados.</label>'+
        '<div class="intake-actions"><button id="roulettePrintButton" class="simulation-run" disabled>Imprimir roleta final</button></div></article>';

      area.querySelectorAll('[data-meta]').forEach(el=>el.addEventListener('input',()=>{
        analysis.metadata[el.dataset.meta]=el.value.trim();
        if(el.dataset.meta==='data'&&!analysis.metadata.dia_semana)analysis.metadata.dia_semana=dayFromBR(el.value.trim());
        updateGate();
      }));
      area.querySelectorAll('[data-row-index]').forEach(el=>el.addEventListener('change',onRowChange));
      area.querySelector('#rouletteHumanConfirm').addEventListener('change',updateGate);
      area.querySelector('#roulettePrintButton').addEventListener('click',()=>{
        renderPrintSheet(printSheet,analysis);printSheet.hidden=false;
        setTimeout(()=>window.print(),60);
      });
      updateGate();
    }

    function rowEditor(row,index){
      const listId='broker-options-'+index;
      const field=brokerFields(row);
      const options=[...new Set([row.canonical_name,...row.suggestions].filter(Boolean))];
      return '<tr class="'+(!row.canonical_name?'needs-review':'')+'">'+
        '<td>'+row.physical_position+'</td>'+
        '<td><input list="'+listId+'" data-row-index="'+index+'" data-field="name" value="'+esc(row.canonical_name||'')+'" placeholder="'+esc(row.raw_name||'ilegível')+'"><datalist id="'+listId+'">'+brokers.map(b=>'<option value="'+esc(b['Nome Comercial'])+'"></option>').join('')+'</datalist>'+
        '<small>Lido: '+esc(row.raw_name||'—')+(options.length?' · sugestões: '+options.map(esc).join(' / '):'')+'</small></td>'+
        '<td><input type="number" min="1" data-row-index="'+index+'" data-field="drawn" value="'+(row.drawn_number??'')+'" '+(row.participation_class!=='salao'?'disabled':'')+'></td>'+
        '<td><select data-row-index="'+index+'" data-field="class"><option value="salao" '+sel(row.participation_class,'salao')+'>SALÃO</option><option value="standby" '+sel(row.participation_class,'standby')+'>STAND-BY</option><option value="online" '+sel(row.participation_class,'online')+'>ON-LINE</option><option value="unknown" '+sel(row.participation_class,'unknown')+'>INDEFINIDO</option></select></td>'+
        '<td><span class="'+(row.broker?'ok-text':'warn-text')+'">'+(row.broker?esc(field.gerente)+' · '+esc(field.creci):'⚠ não validado')+'</span></td>'+
      '</tr>';
    }

    function onRowChange(ev){
      const idx=Number(ev.target.dataset.rowIndex),field=ev.target.dataset.field,row=analysis.rows[idx];
      if(field==='name'){
        const name=ev.target.value.trim();
        row.canonical_name=name;
        row.broker=brokers.find(b=>norm(b['Nome Comercial'])===norm(name))||null;
      }else if(field==='drawn'){
        row.drawn_number=ev.target.value===''?null:Number(ev.target.value);
      }else if(field==='class'){
        row.participation_class=ev.target.value;
        if(row.participation_class!=='salao')row.drawn_number=null;
        renderValidation();return;
      }
      updateGate();
    }

    function updateGate(){
      const gate=area.querySelector('#rouletteGate'),confirm=area.querySelector('#rouletteHumanConfirm'),button=area.querySelector('#roulettePrintButton');
      if(!gate||!confirm||!button)return;
      const errors=validate(analysis);
      if(errors.length){
        gate.className='intake-gate blocked';
        gate.innerHTML='<strong>IMPRESSÃO BLOQUEADA</strong>'+errors.map(e=>'<div>• '+esc(e)+'</div>').join('');
      }else{
        gate.className='intake-gate clear';
        gate.innerHTML='<strong>PRÉVIA CONSISTENTE</strong><div>Sem bloqueios estruturais. Faça a conferência humana final.</div>';
      }
      button.disabled=errors.length>0||!confirm.checked;
    }
  }

  function parseCSV(text){
    const rows=[];let row=[],field='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i],n=text[i+1];
      if(c==='"'&&quoted&&n==='"'){field+='"';i++;continue}
      if(c==='"'){quoted=!quoted;continue}
      if(c===','&&!quoted){row.push(field);field='';continue}
      if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(field);field='';if(row.some(v=>v!==''))rows.push(row);row=[];continue}
      field+=c;
    }
    if(field||row.length){row.push(field);rows.push(row)}
    const headers=rows.shift()||[];
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  }
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sel=(a,b)=>a===b?'selected':'';

  window.RouletteIntake={mount};
})();