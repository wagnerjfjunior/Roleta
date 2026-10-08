(function(){
'use strict';
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function mount(host){
 if(!host||!window.RoletaGeminiConverter)return;
 const article=document.createElement('article');
 article.className='card rltv2-import-card';
 article.innerHTML='<div class="section-head"><div><span class="eyebrow">0 · LEITURA AUTOMÁTICA</span><h2>Conferir extração Gemini</h2></div><span class="intake-risk">NÃO VALIDADO</span></div>'+
 '<p class="small muted">Importe a resposta JSON preliminar do Make/Gemini. Esta etapa é apenas diagnóstico: não autoriza impressão, não importa dados para o SALÃO e não grava na base.</p>'+
 '<div class="section-head"><div><span class="eyebrow">FOTOGRAFIA</span><h3>Escolher origem</h3></div></div>'+
 '<div class="intake-actions"><button type="button" class="simulation-run" data-photo-camera>Tirar foto</button><button type="button" class="simulation-run" data-photo-gallery>Escolher da galeria</button></div>'+
 '<input data-photo-camera-file type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden>'+
 '<input data-photo-gallery-file type="file" accept="image/jpeg,image/png,image/webp" hidden>'+
 '<div data-photo-review hidden><img data-photo-preview alt="Pré-visualização da roleta selecionada" style="width:100%;max-height:420px;object-fit:contain;border-radius:8px;margin-top:12px"><p class="small muted" data-photo-meta></p><label class="intake-confirm"><input data-photo-confirm type="checkbox"> Conferi orientação, legibilidade e enquadramento da fotografia.</label><div class="intake-actions"><button type="button" data-photo-send class="simulation-run" disabled>Enviar para leitura automática</button><button type="button" data-photo-remove class="simulation-run">Substituir fotografia</button></div></div>'+
 '<label class="rltv2-file" style="display:block;margin-top:12px">Código de acesso à leitura automática <input data-photo-access type="password" autocomplete="off" placeholder="Código de acesso configurado na Vercel"></label>'+
 '<div data-photo-status class="intake-gate blocked"><strong>CONFERÊNCIA PENDENTE</strong><div>Selecione a fotografia, confira a prévia e informe o código de acesso. O envio será processado pela API protegida.</div></div>'+
 '<label class="rltv2-file">Carregar resposta Gemini (.json)<input data-gemini-file type="file" accept=".json,application/json"></label>'+
 '<textarea data-gemini-json class="rltv2-json" rows="5" spellcheck="false" placeholder="Ou cole aqui o JSON preliminar do Gemini"></textarea>'+
 '<div class="intake-actions"><button type="button" data-gemini-check class="simulation-run">Analisar rascunho</button></div>'+
 '<div data-gemini-status class="intake-gate blocked"><strong>AGUARDANDO JSON DO GEMINI</strong></div>'+
 '<div data-gemini-detail></div>';
 const target=host.querySelector('.rltv2-import-card');
 if(target)host.insertBefore(article,target);else host.prepend(article);
 const textarea=article.querySelector('[data-gemini-json]'),file=article.querySelector('[data-gemini-file]');
 const status=article.querySelector('[data-gemini-status]'),details=article.querySelector('[data-gemini-detail]');
 file.addEventListener('change',async()=>{const f=file.files?.[0];if(f)textarea.value=await f.text();});

 // Keep the existing GPT JSON import and manual Gemini JSON inspection untouched.
 const camera=article.querySelector('[data-photo-camera-file]');
 const gallery=article.querySelector('[data-photo-gallery-file]');
 const review=article.querySelector('[data-photo-review]');
 const preview=article.querySelector('[data-photo-preview]');
 const meta=article.querySelector('[data-photo-meta]');
 const confirmation=article.querySelector('[data-photo-confirm]');
 const send=article.querySelector('[data-photo-send]');
 const remove=article.querySelector('[data-photo-remove]');
 const photoStatus=article.querySelector('[data-photo-status]');
 let selected=null,objectURL=null;
 const access=article.querySelector('[data-photo-access]');
 const maxBytes=4*1024*1024;
 let busy=false;
 function canSend(){return !!selected&&confirmation.checked&&access.value.trim().length>0&&!busy;}
 function refreshSend(){send.disabled=!canSend();}
 function resetPhoto(){
   if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
   selected=null;camera.value='';gallery.value='';review.hidden=true;
   preview.removeAttribute('src');confirmation.checked=false;send.disabled=true;
 }
 function setPhoto(file){
   resetPhoto();
   if(!file)return;
   const accepted=['image/jpeg','image/png','image/webp'];
   if(!accepted.includes(file.type)||file.size===0||file.size>maxBytes){
     photoStatus.className='intake-gate blocked';
     photoStatus.innerHTML='<strong>FOTOGRAFIA NÃO ACEITA</strong><div>Selecione JPEG, PNG ou WebP de até 4 MB.</div>';
     return;
   }
   selected=file;objectURL=URL.createObjectURL(file);preview.src=objectURL;
   meta.textContent=file.name+' · '+(file.size/1024/1024).toFixed(2)+' MB';
   review.hidden=false;
   photoStatus.className='intake-gate blocked';
   photoStatus.innerHTML='<strong>FOTOGRAFIA SELECIONADA</strong><div>Confira a imagem e informe o código de acesso.</div>';
   refreshSend();
 }
 article.querySelector('[data-photo-camera]').addEventListener('click',()=>camera.click());
 article.querySelector('[data-photo-gallery]').addEventListener('click',()=>gallery.click());
 camera.addEventListener('change',()=>setPhoto(camera.files?.[0]));
 gallery.addEventListener('change',()=>setPhoto(gallery.files?.[0]));
 confirmation.addEventListener('change',refreshSend);
 access.addEventListener('input',refreshSend);
 send.addEventListener('click',async()=>{
   if(!canSend())return;
   busy=true;refreshSend();
   photoStatus.className='intake-gate blocked';
   photoStatus.innerHTML='<strong>PROCESSANDO FOTOGRAFIA</strong><div>Aguardando resposta do Make e do Gemini…</div>';
   try{
     const response=await fetch('/api/roleta-ocr',{
       method:'POST',headers:{
         'Content-Type':selected.type,
         'X-Roleta-Filename':selected.name,
         'X-Roleta-Access-Token':access.value.trim()
       },body:selected,cache:'no-store'
     });
     const json=await response.json();
     if(!response.ok)throw Error(json.error||'Falha no processamento da fotografia.');
     const data=json?.result;
     if(!data||!Array.isArray(data.linhas))throw Error('O Make retornou resposta incompleta.');
     textarea.value=JSON.stringify(data,null,2);
     article.querySelector('[data-gemini-check]').click();
     photoStatus.className='intake-gate blocked';
     photoStatus.innerHTML='<strong>LEITURA RECEBIDA</strong><div>JSON preliminar preenchido. Confira nomes, posições e pendências na seção abaixo; nenhuma impressão foi liberada.</div>';
   }catch(e){
     photoStatus.className='intake-gate blocked';
     photoStatus.innerHTML='<strong>ENVIO NÃO CONCLUÍDO</strong><div>'+escapeHtml(e.message||e)+'</div>';
   }finally{busy=false;access.value='';refreshSend();}
 });
 remove.addEventListener('click',()=>{
   resetPhoto();
   photoStatus.innerHTML='<strong>FOTOGRAFIA REMOVIDA</strong><div>Selecione outra imagem.</div>';
 });
 window.addEventListener('pagehide',()=>{if(objectURL)URL.revokeObjectURL(objectURL);},{once:true});

 article.querySelector('[data-gemini-check]').addEventListener('click',async()=>{
  status.className='intake-gate blocked';status.textContent='Validando leitura e cadastro…';details.replaceChildren();
  try{
   const response=await fetch('/data/print-brokers.json',{cache:'no-store'});
   if(!response.ok)throw Error('Cadastro oficial indisponível.');
   const dto=await response.json();
   const original=JSON.parse(textarea.value);
   const value=original?.result?.linhas?original.result:original?.body?.linhas?original.body:original;
   const draft=window.RoletaGeminiConverter.convertGeminiDraft(value,dto);
   const lines=draft.sorteados;
   const extras=draft.sem_sorteio;
   status.className='intake-gate blocked';
   status.innerHTML='<strong>RASCUNHO NÃO APROVADO</strong><div>SALÃO sorteado: '+lines.length+' · sem sorteio: '+extras.length+' · pendências: '+draft.pendencias.length+'. A ordem abaixo é a do sorteio; compare com a folha original.</div>';
   const problems=document.createElement('div');
   problems.innerHTML='<h3>Pendências</h3>'+draft.pendencias.map(p=>'<div>• '+escapeHtml(p.code)+': '+escapeHtml(p.message)+(p.posicao===undefined?'':' (linha '+escapeHtml(p.posicao)+')')+'</div>').join('');
   details.appendChild(problems);
   const wrap=document.createElement('div');wrap.className='rltv2-review-wrap';
   const tableHeader='<table class="rltv2-review-table"><thead><tr><th>Ordem sorteada</th><th>Posição impressa</th><th>Nome lido</th><th>Nome oficial</th><th>CRECI</th><th>Cadastro</th></tr></thead><tbody>';
   const rowHtml=l=>'<tr><td>'+escapeHtml(l.numero_sorteado??'—')+'</td><td>'+escapeHtml(l.posicao_impressa)+'</td><td>'+escapeHtml(l.nome_lido)+'</td><td>'+escapeHtml(l.nome||'PENDENTE')+'</td><td>'+escapeHtml(l.creci)+'</td><td>'+(l.cadastro_confirmado?'Correspondência única':'Verificar')+'</td></tr>';
   wrap.innerHTML='<h3>SALÃO — ordem do sorteio (conferência preliminar)</h3>'+tableHeader+lines.map(rowHtml).join('')+'</tbody></table>';
   details.appendChild(wrap);
   if(extras.length){
     const pending=document.createElement('div');pending.className='rltv2-review-wrap';
     pending.innerHTML='<h3>Sem número sorteado — confirmar classe de participação</h3>'+tableHeader+extras.map(rowHtml).join('')+'</tbody></table>';
     details.appendChild(pending);
   }

   // Isolated human correction surface. Does not modify the GPT intake until the
   // operator explicitly transfers a complete, validated draft.
   if(window.RoletaHumanBridge){
     const human=document.createElement('section');
     human.className='rltv2-review-card';
     human.style.marginTop='20px';
     const sorted=[...draft.leitura_original.linhas].sort((a,b)=>{
       const x=Number(a.numero_sorteado),y=Number(b.numero_sorteado);
       return (a.numero_sorteado===null?Infinity:x)-(b.numero_sorteado===null?Infinity:y);
     });
     const opts=dto.brokers.map(b=>'<option value="'+escapeHtml(b.nome)+'"></option>').join('');
     const body=sorted.map(l=>'<tr data-correction-row data-pos="'+escapeHtml(l.posicao_impressa)+'">'+
       '<td>'+escapeHtml(l.posicao_impressa)+'</td>'+
       '<td><input data-correct-number aria-label="Número sorteado na posição '+escapeHtml(l.posicao_impressa)+'" type="number" inputmode="numeric" min="1" value="'+escapeHtml(l.numero_sorteado??'')+'"></td>'+
       '<td><input data-correct-name aria-label="Nome na posição '+escapeHtml(l.posicao_impressa)+'" list="geminiReviewBrokerNames" value="'+escapeHtml(l.nome||l.nome_lido)+'"></td>'+
       '<td><select data-correct-class aria-label="Classe na posição '+escapeHtml(l.posicao_impressa)+'">'+
       '<option value="'+(l.numero_sorteado===null?'':'salao')+'">'+(l.numero_sorteado===null?'Confirmar classe':'SALÃO')+'</option>'+
       (l.numero_sorteado===null?'<option value="salao">SALÃO</option>':'')+
       '<option value="standby">STAND BY</option><option value="online">ON-LINE</option><option value="excluir">Excluir (após conferir)</option></select></td><td><label class="rlt-line-check"><input data-correct-confirm type="checkbox"><span data-line-state>Revisar</span></label></td></tr>').join('');
     human.innerHTML='<h3>Correção humana assistida</h3><p class="small muted">Confira os números com a fotografia. Corrija 01/10 e qualquer duplicidade. Os números são usados apenas nesta etapa e não aparecem na impressão.</p>'+
       '<datalist id="geminiReviewBrokerNames">'+opts+'</datalist>'+
       '<div data-line-progress class="intake-gate blocked">0 linhas conferidas.</div><div class="rltv2-review-wrap"><table class="rltv2-review-table"><thead><tr><th>Nº Escolhido</th><th>Nº Sorteado</th><th>Corretor</th><th>Classe</th><th>Conferido</th></tr></thead><tbody>'+body+'</tbody></table></div>'+
       '<h3>Conferir cabeçalho operacional</h3>'+
       '<div class="rltv2-company-review">'+
       '<label><span>Data</span><input data-review-date type="text" value="'+escapeHtml(value.data||'')+'"></label>'+
       '<label><span>Período</span><select data-review-period><option value="MANHÃ">MANHÃ</option><option value="TARDE">TARDE</option><option value="INTEGRAL">INTEGRAL</option></select></label>'+
       '<label><span>Helbor (quantidade na folha)</span><input data-review-helbor type="number" min="0" placeholder="Digitar e conferir na foto"></label>'+
       '<label><span>Tipo de sorteio de empresa</span><select data-review-share><option value="">Escolher regra</option><option value="tegra_share">Share Tegra (2 posições)</option><option value="none">Sem share</option><option value="helbor_share">Share Helbor (2 posições)</option></select></label>'+
       '<label data-review-primary-wrap><span data-review-primary-label>Posição da empresa sem share</span><select data-review-primary><option value="">Confirmar</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>'+
       '<label data-review-secondary-wrap hidden><span>Posição HELBOR</span><select data-review-secondary><option value="">Confirmar</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label></div>'+
       '<div data-review-derived class="intake-gate blocked" aria-live="polite"><strong>SORTEIO DE EMPRESA</strong><div>Escolha o tipo de share e a posição da empresa sem share. O par da outra empresa é calculado automaticamente.</div></div>'+
       '<label class="intake-confirm"><input data-review-enterprise type="checkbox"> Confirmei na fotografia que o empreendimento pertence ao conjunto CAMINHOS DA LAPA e revisei os dados acima.</label>'+
       '<div class="intake-actions"><button type="button" data-review-transfer class="simulation-run">Transferir para conferência canônica</button></div>'+
       '<div data-review-errors class="intake-gate blocked"><strong>TRANSFERÊNCIA NÃO AUTORIZADA</strong><div>Corrija as linhas, escolha as classes e confirme o cabeçalho antes de continuar.</div></div>';
     details.appendChild(human);
     human.querySelector('[data-review-period]').value=['MANHÃ','TARDE','INTEGRAL'].includes(String(value.periodo).toUpperCase())?String(value.periodo).toUpperCase():'TARDE';

     const correctionRows=[...human.querySelectorAll('[data-correction-row]')];
     const lineProgress=human.querySelector('[data-line-progress]');
     const transferButton=human.querySelector('[data-review-transfer]');
     function refreshChecks(){
       const tallies=new Map();
       correctionRows.forEach(tr=>{const n=tr.querySelector('[data-correct-number]').value;if(n)tallies.set(n,(tallies.get(n)||0)+1);});
       let confirmed=0;
       correctionRows.forEach(tr=>{
         const check=tr.querySelector('[data-correct-confirm]');
         const n=tr.querySelector('[data-correct-number]').value;
         const name=tr.querySelector('[data-correct-name]').value.trim();
         const category=tr.querySelector('[data-correct-class]').value;
         const warning=!name||!category||(category==='salao'&&!n)||(n&&tallies.get(n)>1);
         tr.classList.toggle('rlt-line-verified',check.checked);
         tr.classList.toggle('rlt-line-attention',!check.checked&&!!warning);
         tr.querySelector('[data-line-state]').textContent=check.checked?'Conferido':(warning?'Atenção':'Revisar');
         if(check.checked)confirmed++;
       });
       lineProgress.textContent=confirmed+' de '+correctionRows.length+' linhas conferidas.';
       lineProgress.className='intake-gate '+(confirmed===correctionRows.length?'clear':'blocked');
       transferButton.disabled=confirmed!==correctionRows.length;
     }
     correctionRows.forEach(tr=>{
       tr.querySelector('[data-correct-confirm]').addEventListener('change',refreshChecks);
       ['[data-correct-number]','[data-correct-name]','[data-correct-class]'].forEach(sel=>{
         const field=tr.querySelector(sel);
         function invalidate(){tr.querySelector('[data-correct-confirm]').checked=false;refreshChecks();}
         field.addEventListener('input',invalidate);
         field.addEventListener('change',invalidate);
       });
     });
     refreshChecks();

     const modeInput=human.querySelector('[data-review-share]');
     const firstInput=human.querySelector('[data-review-primary]');
     const secondInput=human.querySelector('[data-review-secondary]');
     const primaryLabel=human.querySelector('[data-review-primary-label]');
     const secondaryWrap=human.querySelector('[data-review-secondary-wrap]');
     const derived=human.querySelector('[data-review-derived]');
     function updateCompanyChoice(){
       const mode=modeInput.value;
       primaryLabel.textContent=mode==='tegra_share'?'Posição HELBOR (sem share)':mode==='helbor_share'?'Posição TEGRA (sem share)':'Posição TEGRA';
       secondaryWrap.hidden=mode!=='none';
       if(mode!=='none')secondInput.value='';
       const computed=window.RoletaHumanBridge.companyDraw(mode,firstInput.value,secondInput.value);
       if(computed){
         const tg=computed.tegra_positions.join(' - ');
         const hb=computed.helbor_positions.join(' - ');
         derived.className='intake-gate clear';
         derived.innerHTML='<strong>SORTEIO DE EMPRESA CALCULADO</strong><div>TEGRA '+escapeHtml(tg)+' · HELBOR '+escapeHtml(hb)+'</div><div>Confirme o resultado com o cabeçalho da fotografia.</div>';
       }else{
         derived.className='intake-gate blocked';
         derived.innerHTML='<strong>SORTEIO DE EMPRESA PENDENTE</strong><div>Selecione o tipo e a posição necessária para calcular automaticamente as demais posições.</div>';
       }
     }
     modeInput.addEventListener('change',()=>{firstInput.value='';secondInput.value='';updateCompanyChoice();});
     firstInput.addEventListener('change',updateCompanyChoice);
     secondInput.addEventListener('change',updateCompanyChoice);
     updateCompanyChoice();

     human.querySelector('[data-review-transfer]').addEventListener('click',()=>{
       if(correctionRows.some(tr=>!tr.querySelector('[data-correct-confirm]').checked)){
         const message=human.querySelector('[data-review-errors]');
         message.className='intake-gate blocked';
         message.textContent='Conferência incompleta: confirme cada linha antes de transferir.';
         return;
       }
       const rows=[...human.querySelectorAll('[data-correction-row]')].map(tr=>({
         posicao_impressa:tr.dataset.pos,
         numero_sorteado:tr.querySelector('[data-correct-number]').value,
         nome:tr.querySelector('[data-correct-name]').value,
         classe:tr.querySelector('[data-correct-class]').value
       }));
       const header={
         confirmEnterprise:human.querySelector('[data-review-enterprise]').checked,
         data:human.querySelector('[data-review-date]').value,
         periodo:human.querySelector('[data-review-period]').value,
         helbor:human.querySelector('[data-review-helbor]').value,
         share:human.querySelector('[data-review-share]').value,
         position1:human.querySelector('[data-review-primary]').value,
         position2:human.querySelector('[data-review-secondary]').value
       };
       const checked=window.RoletaHumanBridge.toCanonicalReview({source:value,rows,directory:dto,header});
       const errors=human.querySelector('[data-review-errors]');
       if(checked.errors.length){
         errors.className='intake-gate blocked';
         errors.innerHTML='<strong>CORREÇÃO NECESSÁRIA</strong>'+checked.errors.map(e=>'<div>• '+escapeHtml(e)+'</div>').join('');
         return;
       }
       const canonicalInput=host.querySelector('#rltv2Json');
       const canonicalButton=host.querySelector('#rltv2Validate');
       if(!canonicalInput||!canonicalButton){errors.textContent='Importador canônico indisponível.';return;}
       canonicalInput.value=JSON.stringify(checked.payload,null,2);
       canonicalButton.click();
       errors.className='intake-gate clear';
       errors.innerHTML='<strong>ENVIADO À CONFERÊNCIA CANÔNICA</strong><div>Ainda é obrigatório revisar SALÃO, STAND BY, ON-LINE e confirmar a prévia para imprimir.</div>';
     });
   }
  }catch(e){
   status.className='intake-gate blocked';
   status.innerHTML='<strong>LEITURA BLOQUEADA</strong><div>'+escapeHtml(e.message||e)+'</div>';
  }
 });
}
window.RoletaGeminiDraftUI={mount};
})();