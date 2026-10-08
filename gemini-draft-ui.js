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
  }catch(e){
   status.className='intake-gate blocked';
   status.innerHTML='<strong>LEITURA BLOQUEADA</strong><div>'+escapeHtml(e.message||e)+'</div>';
  }
 });
}
window.RoletaGeminiDraftUI={mount};
})();