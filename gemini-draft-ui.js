(function(){
'use strict';
function reviewDateISO(value){
 const raw=String(value??'').trim();
 const br=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
 const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
 const y=br?br[3]:iso?.[1],m=br?br[2]:iso?.[2],d=br?br[1]:iso?.[3];
 if(!y||!m||!d)return '';
 const date=new Date(Date.UTC(+y,+m-1,+d));
 if(date.getUTCFullYear()!==+y||date.getUTCMonth()!==+m-1||date.getUTCDate()!==+d)return '';
 return y+'-'+m+'-'+d;
}
function reviewDateBR(iso){
 const x=reviewDateISO(iso);
 return x?x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4):'';
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function mount(host){
 if(!host||!window.RoletaGeminiConverter)return;
 const article=document.createElement('article');
 article.className='card rltv2-import-card';
 article.innerHTML='<div class="section-head"><div><span class="eyebrow">0 · LEITURA AUTOMÁTICA</span><h2>Conferir extração Gemini</h2></div><span class="intake-risk">NÃO VALIDADO</span></div>'+
 '<p class="small muted">Importe a resposta JSON preliminar do Make/Gemini. Confira os participantes diretamente na tabela. Nenhuma impressão ou gravação ocorre sem validação humana.</p>'+
 '<div class="section-head"><div><span class="eyebrow">FOTOGRAFIA</span><h3>Escolher origem</h3></div></div>'+
 '<div class="intake-actions"><button type="button" class="simulation-run" data-photo-camera>Tirar foto</button><button type="button" class="simulation-run" data-photo-gallery>Escolher da galeria</button></div>'+
 '<input data-photo-camera-file type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden>'+
 '<input data-photo-gallery-file type="file" accept="image/jpeg,image/png,image/webp" hidden>'+
 '<div data-photo-review hidden><img data-photo-preview alt="Pré-visualização da roleta selecionada" style="width:100%;max-height:420px;object-fit:contain;border-radius:8px;margin-top:12px"><p class="small muted" data-photo-meta></p><label class="intake-confirm"><input data-photo-confirm type="checkbox"> Conferi orientação, legibilidade e enquadramento da fotografia.</label><label class="intake-confirm" data-shadow-consent-wrap hidden><input data-shadow-consent type="checkbox"> Autorizo usar esta foto e a roleta final conferida no aprendizado privado do OCR.space, após salvar no Supabase.</label><div class="intake-actions"><button type="button" data-photo-send class="simulation-run" disabled>Enviar para leitura automática</button><button type="button" data-photo-remove class="simulation-run">Substituir fotografia</button></div></div>'+
 '<div data-google-auth class="intake-gate blocked"><strong>ACESSO À LEITURA AUTOMÁTICA</strong><div>Verificando login Google…</div></div>'+
 '<div class="intake-actions"><a data-google-login href="/api/auth/google/start" class="simulation-run" style="text-decoration:none">Entrar com Google</a><button data-google-logout type="button" class="simulation-run" hidden>Sair do Google</button></div>'+
 '<div data-photo-status class="intake-gate blocked"><strong>CONFERÊNCIA PENDENTE</strong><div>Faça login com Google, selecione uma foto e confirme o enquadramento.</div></div><div data-upload-progress class="rlt-upload-progress" role="status" aria-live="polite" hidden><span data-upload-label></span><progress data-upload-meter max="100" value="0"></progress></div>'+
 '<details class="rlt-technical-backup"><summary>Backup técnico · JSON Gemini</summary><label class="rltv2-file">Carregar resposta Gemini (.json)<input data-gemini-file type="file" accept=".json,application/json"></label>'+
 '<textarea data-gemini-json class="rltv2-json" rows="5" spellcheck="false" placeholder="Ou cole aqui o JSON preliminar do Gemini"></textarea>'+
 '<div class="intake-actions"><button type="button" data-gemini-check class="simulation-run">Analisar JSON manual</button><button type="button" data-json-copy class="simulation-run">Copiar JSON</button><button type="button" data-json-download class="simulation-run">Baixar JSON</button></div></details>'+
 '<div data-gemini-status class="intake-gate blocked"><strong>AGUARDANDO JSON DO GEMINI</strong></div>'+
 '<div data-gemini-detail></div>';
 const target=host.querySelector('.rltv2-import-card');
 if(target)host.insertBefore(article,target);else host.prepend(article);
 const textarea=article.querySelector('[data-gemini-json]'),file=article.querySelector('[data-gemini-file]');
 const status=article.querySelector('[data-gemini-status]'),details=article.querySelector('[data-gemini-detail]');
 const progressBox=article.querySelector('[data-upload-progress]'),progressLabel=article.querySelector('[data-upload-label]'),progressMeter=article.querySelector('[data-upload-meter]');
 function progress(label,n){progressBox.hidden=false;progressLabel.textContent=label;if(n===null)progressMeter.removeAttribute('value');else progressMeter.value=n;}
 function upload(file,csrf){return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open('POST','/api/roleta-ocr');x.timeout=210000;x.ontimeout=()=>reject(Error('O telefone ou a conexão encerrou a espera pela leitura. O Make pode continuar processando.'));x.setRequestHeader('Content-Type',file.type);x.setRequestHeader('X-Roleta-Filename',file.name);x.setRequestHeader('X-Roleta-CSRF',csrf);x.upload.onprogress=e=>{if(e.lengthComputable){const n=Math.round(100*e.loaded/e.total);progress('Enviando imagem: '+n+'%',n);}};x.upload.onload=()=>progress('Foto enviada. Make/Gemini processando…',null);x.onerror=()=>reject(Error('Falha de conexão.'));x.onabort=()=>reject(Error('Envio cancelado.'));x.onload=()=>{let json;try{json=JSON.parse(x.responseText);}catch{return reject(Error('Resposta inválida do servidor.'));}if(x.status<200||x.status>=300)return reject(Error(json.error||'Falha na leitura.'));resolve(json);};x.send(file);});}

 // The new asynchronous path is strictly opt-in server-side. No secrets reach the browser.
 const pendingKey=()=>googleSession?.email?'roleta:ocr-pending:'+googleSession.email.toLowerCase():null;
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function asyncAvailable(){
   // An unavailable capability endpoint is NOT evidence that the old synchronous
   // endpoint is safe to use. Fail closed instead of silently resubmitting.
   let r;
   try{r=await fetch('/api/ocr-job-submit',{cache:'no-store',credentials:'same-origin'});}
   catch{throw Error('Não foi possível verificar o serviço OCR. Nenhuma fotografia foi enviada; tente novamente.');}
   if(!r.ok)throw Error('Serviço OCR temporariamente indisponível. Nenhuma fotografia foi enviada.');
   const capability=await r.json().catch(()=>null);
   if(typeof capability?.enabled!=='boolean')throw Error('Não foi possível confirmar o modo de processamento OCR.');
   return capability.enabled;
 }
 async function waitForResult(jobId){
   for(let i=0;i<140;i++){
     const r=await fetch('/api/ocr-job-status?job_id='+encodeURIComponent(jobId),{cache:'no-store',credentials:'same-origin'});
     if(!r.ok)throw Error('Não foi possível consultar a leitura. Reabra a Roleta com a mesma conta para recuperar o resultado.');
     const job=await r.json();
     if(job.state==='READY_FOR_REVIEW'&&job.result&&Array.isArray(job.result.linhas)){
       try{if(pendingKey())localStorage.removeItem(pendingKey());}catch{}
       return {result:job.result,source:'make-gemini'};
     }
     if(job.state==='FAILED')throw Error('O processamento falhou. Confira a fotografia e tente novamente.');
     progress(job.reconciliation_required?'Leitura demorada. Resultado preservado; conferindo o processamento…':'Gemini processando em segundo plano…',null);
     await sleep(3000);
   }
   throw Error('Leitura ainda em andamento. Você pode fechar e reabrir a página: o processamento será recuperado.');
 }
 async function uploadAsync(image,csrf){
   const r=await fetch('/api/ocr-job-submit',{method:'POST',credentials:'same-origin',
     headers:{'Content-Type':image.type,'X-Roleta-Filename':image.name,'X-Roleta-CSRF':csrf},body:image});
   const data=await r.json().catch(()=>({}));
   if(!r.ok||!data.job_id)throw Error(data.error||'Não foi possível iniciar a leitura assíncrona.');
   try{if(pendingKey())localStorage.setItem(pendingKey(),data.job_id);}catch{}
   progress('Imagem recebida. O resultado será preservado para sua conta…',null);
   return waitForResult(data.job_id);
 }
 async function resumePending(){
   const key=pendingKey();if(!key||busy)return;
   let id;try{id=localStorage.getItem(key);}catch{return;}
   if(!id||!/^[0-9a-f-]{36}$/i.test(id))return;
   try{if(!(await asyncAvailable()))return;}catch{return;}
   busy=true;refreshSend();
   try{
     progress('Recuperando leitura anterior…',null);
     const json=await waitForResult(id);
     textarea.value=JSON.stringify(json.result,null,2);
     photoEvidence=null; // The original photo is not stored in browser storage.
     await renderDraft();
     photoStatus.innerHTML='<strong>LEITURA RECUPERADA</strong><div>Confira todos os participantes. A foto original não foi armazenada neste navegador.</div>';
     progress('Leitura recuperada · confira os participantes',100);
   }catch(e){
     photoStatus.innerHTML='<strong>LEITURA PENDENTE</strong><div>'+escapeHtml(e.message||e)+'</div>';
   }finally{busy=false;refreshSend();}
 }
 article.querySelector('[data-json-copy]').addEventListener('click',async()=>{if(!textarea.value)return;try{await navigator.clipboard.writeText(textarea.value);}catch{textarea.focus();textarea.select();}});
 article.querySelector('[data-json-download]').addEventListener('click',()=>{if(!textarea.value)return;const url=URL.createObjectURL(new Blob([textarea.value],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='roleta-gemini-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
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
 let selected=null,objectURL=null,photoGeneration=0,preparing=false;
 const authIndicator=article.querySelector('[data-google-auth]');
 const loginLink=article.querySelector('[data-google-login]');
 const logoutButton=article.querySelector('[data-google-logout]');
 let googleSession=null;
 let learningCandidate=null;
 let photoEvidence=null;
 const shadowConsent=article.querySelector('[data-shadow-consent]');
 const shadowConsentWrap=article.querySelector('[data-shadow-consent-wrap]');
 fetch('/api/ocr-shadow-submit',{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.json():{enabled:false}).then(v=>{shadowConsentWrap.hidden=v.enabled!==true;if(v.enabled!==true)shadowConsent.checked=false;}).catch(()=>{shadowConsent.checked=false;shadowConsentWrap.hidden=true;});
 host.addEventListener('roleta-final-saved',event=>{
   const evidence=photoEvidence;
   if(!shadowConsent.checked||!evidence?.eventKey||!evidence.file||!googleSession?.authenticated)return;
   const detail=event.detail||{};
   if(window.RoletaOcrLearning?.key(evidence.reviewed)!==evidence.eventKey)return;
   const e=evidence.reviewed?.evento||{};
   const date=String(e.data||'').split('/');
   const suffix={MANHA:'M',TARDE:'T',INTEGRAL:'I'}[String(e.periodo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()];
   if(date.length!==3||detail.event_id!==date[2]+'-'+date[1]+'-'+date[0]+'-'+suffix)return;
   if(!['saved','replayed'].includes(detail.status)||!Number.isSafeInteger(detail.version)||detail.version<1)return;
   const headers={'Content-Type':evidence.file.type,'X-Roleta-CSRF':googleSession.csrfToken,'X-Roleta-OCR-Consent':'yes','X-Roleta-Event-Id':detail.event_id,'X-Roleta-Final-Version':String(detail.version)};
   const note=details.querySelector('[data-learning-status]');
   fetch('/api/ocr-shadow-submit',{method:'POST',headers,body:evidence.file,cache:'no-store',credentials:'same-origin'}).then(async response=>{
     if(note)note.textContent=response.status===202?'Evidência enviada para aprendizagem privada. A revisão humana continua obrigatória.':'A folha foi salva; a aprendizagem paralela ainda não está disponível.';
   }).catch(()=>{if(note)note.textContent='Folha salva. Falha na aprendizagem paralela, sem impacto no resultado.';});
 });
 host.addEventListener('roleta-final-confirmed',event=>{
   const learning=window.RoletaOcrLearning,candidate=learningCandidate;
   if(!learning||!candidate||!googleSession?.authenticated||googleSession.email!==candidate.account)return;
   if(learning.key(event.detail)!==candidate.eventKey)return;
   try{
     const state=learning.load(localStorage,candidate.account);
     const next=learning.record(state,candidate.source,event.detail,candidate.directory);
     const saved=learning.save(localStorage,candidate.account,next);
     const note=details.querySelector('[data-learning-status]');
     if(note)note.textContent=saved?'Correções registradas neste navegador. Sugestões de nomes exigem duas folhas distintas sem conflito; a conferência continua obrigatória.':'Não foi possível guardar as correções neste navegador. A folha final continua válida.';
   }catch{/* Learning failure never blocks review, output or saving. */}
 });
 async function checkGoogleSession(){
   try{
     const result=await fetch('/api/auth/session',{cache:'no-store'});
     if(!result.ok)throw Error('Sessão indisponível');
     const data=await result.json();
     googleSession=data.authenticated&&data.csrfToken?data:null;
   }catch{googleSession=null;}
   authIndicator.className='intake-gate '+(googleSession?'clear':'blocked');
   authIndicator.textContent=googleSession?'Conectado com Google: '+googleSession.email:'Entre com Google para enviar fotografias.';
   loginLink.hidden=!!googleSession;
   logoutButton.hidden=!googleSession;
   refreshSend();
 }
 logoutButton.addEventListener('click',async()=>{
   if(!googleSession)return;
   const response=await fetch('/api/auth/logout',{method:'POST',headers:{'X-Roleta-CSRF':googleSession.csrfToken}});
   if(response.ok)await checkGoogleSession();
 });

 let busy=false;
 function canSend(){return !!selected&&confirmation.checked&&!!googleSession&&!busy&&!preparing;}
 function refreshSend(){
   send.disabled=!canSend();
   remove.disabled=busy||preparing;
   article.querySelector('[data-photo-camera]').disabled=busy||preparing;
   article.querySelector('[data-photo-gallery]').disabled=busy||preparing;
 }
 function resetPhoto(){
   photoGeneration++;preparing=false;
   if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
   selected=null;photoEvidence=null;camera.value='';gallery.value='';review.hidden=true;
   preview.removeAttribute('src');confirmation.checked=false;send.disabled=true;
 }
 async function setPhoto(file){
   if(busy)return;
   resetPhoto();
   if(!file)return;
   const generation=photoGeneration;
   preparing=true;refreshSend();progressBox.hidden=true;
   photoStatus.className='intake-gate blocked';
   photoStatus.innerHTML='<strong>PREPARANDO FOTOGRAFIA</strong><div>Reduzindo o arquivo para leitura automática…</div>';
   try{
     if(!window.RoletaPhotoPrepare)throw Error('Recarregue a página para preparar a fotografia.');
     const prepared=await window.RoletaPhotoPrepare.prepare(file);
     if(generation!==photoGeneration)return;
     selected=prepared.file;objectURL=URL.createObjectURL(selected);preview.src=objectURL;
     meta.textContent=file.name+' · original: '+(file.size/1024/1024).toFixed(2)+' MB · envio: '+Math.ceil(selected.size/1000)+' KB · '+prepared.width+' × '+prepared.height+' px';
     review.hidden=false;
     photoStatus.innerHTML='<strong>FOTOGRAFIA PRONTA</strong><div>Esta é a imagem que será enviada. Confira orientação, nomes e números antes de confirmar.</div>';
   }catch(e){
     if(generation!==photoGeneration)return;
     photoStatus.innerHTML='<strong>FOTOGRAFIA NÃO ACEITA</strong><div>'+escapeHtml(e.message||e)+'</div>';
   }finally{if(generation===photoGeneration){preparing=false;refreshSend();}}
 }
 article.querySelector('[data-photo-camera]').addEventListener('click',()=>camera.click());
 article.querySelector('[data-photo-gallery]').addEventListener('click',()=>gallery.click());
 camera.addEventListener('change',()=>setPhoto(camera.files?.[0]));
 gallery.addEventListener('change',()=>setPhoto(gallery.files?.[0]));
 confirmation.addEventListener('change',refreshSend);
 checkGoogleSession().then(resumePending);
 send.addEventListener('click',async()=>{
   if(!canSend())return;
   busy=true;refreshSend();
   photoStatus.className='intake-gate blocked';
   photoStatus.innerHTML='<strong>PROCESSANDO FOTOGRAFIA</strong><div>A fotografia será enviada para processamento. Se o modo assíncrono estiver ativo, você poderá voltar mais tarde com a mesma conta.</div>';
   progress('Iniciando envio: 0%',0);
   try{
     const json=await (await asyncAvailable()?uploadAsync(selected,googleSession.csrfToken):upload(selected,googleSession.csrfToken));
     const data=json?.result;
     if(!data||!Array.isArray(data.linhas))throw Error('O Make retornou resposta incompleta.');
     textarea.value=JSON.stringify(data,null,2);
     photoEvidence={file:selected,draftJson:JSON.stringify(data),eventKey:null,reviewed:null};
     progress('Leitura recebida. Preparando conferência…',null);
     await renderDraft();
     photoStatus.className='intake-gate blocked';
     photoStatus.innerHTML=json.source==='make-ocr-space'?'<strong>LEITURA ALTERNATIVA RECEBIDA</strong><div>Confira a foto com atenção. Acrescente participantes ausentes e complete os campos que ficaram vazios.</div>':'<strong>LEITURA RECEBIDA</strong><div>Confira nomes e números na tabela; a conferência humana continua obrigatória.</div>';
     progress('Leitura concluída · pronto para revisão',100);
   }catch(e){
     photoStatus.className='intake-gate blocked';
     photoStatus.innerHTML='<strong>ENVIO NÃO CONCLUÍDO</strong><div>'+escapeHtml(e.message||e)+'</div>';
     progressBox.hidden=true;
   }finally{busy=false;refreshSend();}
 });
 // Rotation is requested by the simplified UX and changes the actual upload file.
 article.addEventListener('click',async event=>{
   const button=event.target.closest('[data-photo-rotate]');
   if(!button||!selected||busy||preparing)return;
   preparing=true;refreshSend();button.disabled=true;
   const generation=photoGeneration;
   let bitmap;
   try{
     bitmap=await createImageBitmap(selected);
     const canvas=document.createElement('canvas');canvas.width=bitmap.height;canvas.height=bitmap.width;
     const context=canvas.getContext('2d');if(!context)throw Error('Não foi possível girar a foto.');
     context.translate(canvas.width,0);context.rotate(Math.PI/2);context.drawImage(bitmap,0,0);
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
     if(!blob)throw Error('Não foi possível girar a foto.');
     if(generation!==photoGeneration)return;
     preparing=false;
     await setPhoto(new File([blob],'roleta-girada.jpg',{type:'image/jpeg'}));
   }catch(error){
     if(generation===photoGeneration)photoStatus.textContent='Não foi possível girar a foto. Tente novamente ou escolha outra imagem.';
   }finally{
     bitmap?.close();if(generation===photoGeneration){preparing=false;refreshSend();}button.disabled=false;
   }
 });
 remove.addEventListener('click',()=>{
   if(busy)return;
   resetPhoto();
   photoStatus.innerHTML='<strong>FOTOGRAFIA REMOVIDA</strong><div>Selecione outra imagem.</div>';
 });
 window.addEventListener('pagehide',()=>{if(objectURL)URL.revokeObjectURL(objectURL);},{once:true});

 async function renderDraft(){
  learningCandidate=null;
  status.className='intake-gate blocked';status.textContent='Validando leitura e cadastro…';details.replaceChildren();
  try{
   const [response,aliasResponse]=await Promise.all([fetch('/data/print-brokers.json',{cache:'no-store'}),fetch('/data/broker-name-aliases.json',{cache:'no-store'}).catch(()=>null)]);
   if(!response.ok)throw Error('Cadastro oficial indisponível.');
   const dto=await response.json();
   const aliases=aliasResponse?.ok?(await aliasResponse.json().catch(()=>({}))).aliases||{}:{};
   const original=JSON.parse(textarea.value);
   const value=original?.result?.linhas?original.result:original?.body?.linhas?original.body:original;
   const learning=window.RoletaOcrLearning;
   let learnedAliases={};
   try{if(learning&&googleSession?.authenticated&&value.source==='ocr-space')learnedAliases=learning.suggestions(learning.load(localStorage,googleSession.email),dto);}catch{}
   const draft=window.RoletaGeminiConverter.convertGeminiDraft(value,dto,{aliases,learnedAliases});
   const lines=draft.sorteados;
   const extras=draft.sem_sorteio;
   status.className='intake-gate blocked';
   status.innerHTML='<strong>RASCUNHO NÃO APROVADO</strong><div>SALÃO sorteado: '+lines.length+' · sem sorteio: '+extras.length+' · pendências: '+draft.pendencias.length+'. A ordem abaixo é a do sorteio; compare com a folha original.</div>';
   const technicalTables=document.createElement('details');technicalTables.className='rlt-technical-backup';technicalTables.innerHTML='<summary>Diagnóstico · leitura preliminar</summary>';details.appendChild(technicalTables);
   const problems=document.createElement('div');
   problems.innerHTML='<h3>Pendências</h3>'+draft.pendencias.map(p=>'<div>• '+escapeHtml(p.code)+': '+escapeHtml(p.message)+(p.posicao===undefined?'':' (linha '+escapeHtml(p.posicao)+')')+'</div>').join('');
   technicalTables.appendChild(problems);
   const wrap=document.createElement('div');wrap.className='rltv2-review-wrap';
   const tableHeader='<table class="rltv2-review-table"><thead><tr><th>Ordem sorteada</th><th>Posição impressa</th><th>Nome lido</th><th>Nome oficial</th><th>CRECI</th><th>Cadastro</th></tr></thead><tbody>';
   const rowHtml=l=>'<tr><td>'+escapeHtml(l.numero_sorteado??'—')+'</td><td>'+escapeHtml(l.posicao_impressa)+'</td><td>'+escapeHtml(l.nome_lido)+'</td><td>'+escapeHtml(l.nome||'PENDENTE')+'</td><td>'+escapeHtml(l.creci)+'</td><td>'+(l.cadastro_confirmado?'Correspondência única':'Verificar')+'</td></tr>';
   wrap.innerHTML='<h3>SALÃO — ordem do sorteio (conferência preliminar)</h3>'+tableHeader+lines.map(rowHtml).join('')+'</tbody></table>';
   technicalTables.appendChild(wrap);
   if(extras.length){
     const pending=document.createElement('div');pending.className='rltv2-review-wrap';
     pending.innerHTML='<h3>Sem número sorteado — confirmar classe de participação</h3>'+tableHeader+extras.map(rowHtml).join('')+'</tbody></table>';
     technicalTables.appendChild(pending);
   }

   // Isolated human correction surface. Does not modify the GPT intake until the
   // operator explicitly transfers a complete, validated draft.
   if(!window.RoletaHumanBridge)throw Error('O módulo de conferência não carregou. Atualize a página.');
   if(window.RoletaHumanBridge){
     const human=document.createElement('section');
     human.className='rltv2-review-card';
     human.style.marginTop='20px';
     const sorted=[...draft.leitura_original.linhas];
     // Emergency OCR is reviewed alongside the photograph, in physical row order.
     if(value.source!=='ocr-space')sorted.sort((a,b)=>{
       const x=Number(a.numero_sorteado),y=Number(b.numero_sorteado);
       return (a.numero_sorteado===null?Infinity:x)-(b.numero_sorteado===null?Infinity:y);
     });
     const opts=dto.brokers.map(b=>'<option value="'+escapeHtml(b.nome)+'"></option>').join('');
     const body=sorted.map((l,i)=>'<div class="rlt-review-item" data-correction-row data-source-index="'+i+'" data-pos="'+escapeHtml(l.posicao_impressa)+'">'+
       '<div class="rlt-review-field rlt-review-pos"><span class="rlt-field-title">Posição</span><input data-correct-position aria-label="Posição impressa na folha" type="number" inputmode="numeric" min="1" max="100" value="'+escapeHtml(l.posicao_impressa??'')+'"></div>'+
       '<div class="rlt-review-field rlt-review-ball"><span class="rlt-field-title">Bolinha</span><input data-correct-number aria-label="Número sorteado na posição '+escapeHtml(l.posicao_impressa)+'" type="number" inputmode="numeric" min="1" value="'+escapeHtml(l.numero_sorteado??'')+'">'+(l.bolinha_ambigua?'<small>OCR: '+escapeHtml(l.numero_lido_original)+' · preencher pela foto</small>':'')+'</div>'+
       '<div class="rlt-review-field rlt-review-name"><span class="rlt-field-title">Corretor</span><input data-correct-name aria-label="Nome na posição '+escapeHtml(l.posicao_impressa)+'" list="geminiReviewBrokerNames" value="'+escapeHtml(l.nome||l.nome_lido)+'">'+(l.nome&&l.cadastro_resolucao!=='NOME_EXATO'?'<small>OCR: '+escapeHtml(l.nome_lido)+' → '+escapeHtml(l.nome)+' · conferir</small>':'')+'</div>'+
       '<div class="rlt-review-field rlt-review-class"><span class="rlt-field-title">Participação</span><select data-correct-class aria-label="Classe na posição '+escapeHtml(l.posicao_impressa)+'">'+
       '<option value="'+(l.numero_sorteado===null?'':'salao')+'">'+(l.numero_sorteado===null?'Confirmar classe':'SALÃO')+'</option>'+
       (l.numero_sorteado===null?'<option value="salao">SALÃO</option>':'')+
       '<option value="standby">STAND BY</option><option value="online">ON-LINE</option><option value="excluir">Excluir (após conferir)</option></select></div><div class="rlt-review-field rlt-review-confirm"><label class="rlt-line-check"><input data-correct-confirm type="checkbox"><span data-line-state>Revisar</span></label></div></div>').join('');
     human.innerHTML='<h3>Correção humana assistida</h3><p class="small muted">Confira os números com a fotografia. Corrija 01/10 e qualquer duplicidade. Os números são usados apenas nesta etapa e não aparecem na impressão.</p>'+
       '<datalist id="geminiReviewBrokerNames">'+opts+'</datalist>'+
       '<div data-line-progress class="intake-gate blocked">0 linhas conferidas.</div><div class="rlt-review-list" data-review-rows role="group" aria-label="Conferência de corretores">'+body+'</div>'+
       '<div class="intake-actions"><button type="button" data-review-add-line class="simulation-run">Adicionar participante que falta</button></div>'+
       '<h3>Conferir cabeçalho operacional</h3>'+
       '<div class="rltv2-company-review">'+
       '<label><span>Data</span><input data-review-date type="date" lang="pt-BR" required aria-label="Selecionar dia, mês e ano" value="'+escapeHtml(reviewDateISO(window.RoletaIntakeNormalization.dateInfo(value.data)?.data||value.data||''))+'"></label>'+
       '<label><span>Período</span><select data-review-period><option value="MANHÃ">MANHÃ</option><option value="TARDE">TARDE</option><option value="INTEGRAL">INTEGRAL</option></select></label>'+
       '<label><span>Helbor (quantidade na folha)</span><input data-review-helbor type="number" min="0" placeholder="Digitar e conferir na foto"></label>'+
       '<label><span>Tipo de sorteio de empresa</span><select data-review-share><option value="">Escolher regra</option><option value="tegra_share">Share Tegra (2 posições)</option><option value="none">Sem share</option><option value="helbor_share">Share Helbor (2 posições)</option></select></label>'+
       '<label data-review-primary-wrap><span data-review-primary-label>Posição da empresa sem share</span><select data-review-primary><option value="">Confirmar</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>'+
       '<label data-review-secondary-wrap hidden><span>Posição HELBOR</span><select data-review-secondary><option value="">Confirmar</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label></div>'+
       '<div data-review-derived class="intake-gate blocked" aria-live="polite"><strong>SORTEIO DE EMPRESA</strong><div>Escolha o tipo de share e a posição da empresa sem share. O par da outra empresa é calculado automaticamente.</div></div>'+
       '<label class="intake-confirm"><input data-review-enterprise type="checkbox"> Confirmei na fotografia que o empreendimento pertence ao conjunto CAMINHOS DA LAPA e revisei os dados acima.</label>'+
       '<div class="intake-actions"><button type="button" data-review-transfer class="simulation-run">Transferir para conferência canônica</button></div>'+
       '<div data-review-errors class="intake-gate blocked"><strong>TRANSFERÊNCIA NÃO AUTORIZADA</strong><div>Corrija as linhas, escolha as classes e confirme o cabeçalho antes de continuar.</div></div>';
     details.insertBefore(human,technicalTables);
     if(value.source==='ocr-space'&&learning){
       const note=document.createElement('p');note.dataset.learningStatus='';note.className='small muted';note.textContent='Sugestões de nomes usam correções confirmadas em duas folhas distintas. Histórico local separado por conta Google; números não são aprendidos.';
       const clear=document.createElement('button');clear.type='button';clear.textContent='Limpar aprendizado deste navegador';
       clear.addEventListener('click',()=>{try{const ok=googleSession?.authenticated&&learning.save(localStorage,googleSession.email,learning.empty());learningCandidate=null;note.textContent=ok?'Aprendizado removido. As sugestões já exibidas continuam exigindo conferência; a próxima leitura usará o histórico vazio.':'Não foi possível limpar o histórico.';}catch{note.textContent='Não foi possível limpar o histórico.';}});
       human.append(note,clear);
     }
     if(value.source==='ocr-space'){
       const period=human.querySelector('[data-review-period]');period.insertAdjacentHTML('afterbegin','<option value="">Confirmar período</option>');
       const note=document.createElement('p');note.className='intake-gate blocked';note.textContent=value.metodo_leitura==='column-text'?'Nomes e posições recuperados. Preencha as bolinhas consultando a foto: o OCR devolveu a coluna de números sem associação segura às linhas.':value.metodo_leitura==='manual'?'Não foi possível separar a tabela. Preencha os participantes consultando a foto e use “Adicionar participante que falta” para incluir as demais linhas.':'Leitura alternativa: confira as linhas na mesma ordem da foto. Complete campos vazios e acrescente os participantes que faltarem.';human.prepend(note);
       const original=document.createElement('details');const label=document.createElement('summary');label.textContent='Ver texto reconhecido na folha';const content=document.createElement('pre');content.style.whiteSpace='pre-wrap';content.textContent=value.texto_original||'';original.append(label,content);human.append(original);
     }
     human.querySelector('[data-review-period]').value=['MANHÃ','TARDE','INTEGRAL'].includes(String(value.periodo).toUpperCase())?String(value.periodo).toUpperCase():(value.source==='ocr-space'?'':'TARDE');

     const correctionRows=[...human.querySelectorAll('[data-correction-row]')];
     const lineProgress=human.querySelector('[data-line-progress]');
     const transferButton=human.querySelector('[data-review-transfer]');
     function refreshChecks(){
       const tallies=new Map(),positions=new Map();
       const numericPosition=value=>/^\d+$/.test(value)&&Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=100?Number(value):null;
       correctionRows.forEach(tr=>{
         const n=tr.querySelector('[data-correct-number]').value;
         const p=numericPosition(tr.querySelector('[data-correct-position]').value);
         if(tr.querySelector('[data-correct-class]').value==='excluir')return;
         if(n)tallies.set(Number(n),(tallies.get(Number(n))||0)+1);
         if(p!==null)positions.set(p,(positions.get(p)||0)+1);
       });
       let confirmed=0;
       correctionRows.forEach(tr=>{
         const check=tr.querySelector('[data-correct-confirm]');
         const n=tr.querySelector('[data-correct-number]').value;
         const physical=tr.querySelector('[data-correct-position]').value;
         const name=tr.querySelector('[data-correct-name]').value.trim();
         const category=tr.querySelector('[data-correct-class]').value;
         const parsedPhysical=numericPosition(physical);
         const invalidPhysical=parsedPhysical===null||(positions.get(parsedPhysical)>1);
         // Exclusion requires explicit human confirmation, not a broker/position match.
         const warning=category==='excluir'?false:(invalidPhysical||!name||!category||(category==='salao'&&(!n||!/^\d+$/.test(n)||Number(n)<1||/^0\d{2,}$/.test(n)))||(n&&tallies.get(Number(n))>1));
         if(warning&&check.checked)check.checked=false;
         tr.classList.toggle('rlt-line-verified',check.checked);
         tr.classList.toggle('rlt-line-attention',!check.checked&&!!warning);
         tr.querySelector('[data-line-state]').textContent=check.checked?'Conferido':(warning?'Atenção':'Revisar');
         if(check.checked)confirmed++;
       });
       lineProgress.textContent=confirmed+' de '+correctionRows.length+' linhas conferidas.';
       lineProgress.className='intake-gate '+(confirmed===correctionRows.length?'clear':'blocked');
       transferButton.disabled=confirmed!==correctionRows.length;
     }
     function bindCorrectionRow(tr){
       tr.querySelector('[data-correct-confirm]').addEventListener('change',refreshChecks);
       ['[data-correct-position]','[data-correct-number]','[data-correct-name]','[data-correct-class]'].forEach(sel=>{
         const field=tr.querySelector(sel);
         function invalidate(){tr.querySelector('[data-correct-confirm]').checked=false;refreshChecks();}
         field.addEventListener('input',invalidate);
         field.addEventListener('change',invalidate);
       });
     }
     correctionRows.forEach(bindCorrectionRow);
     human.querySelector('[data-review-add-line]').addEventListener('click',()=>{
       if(correctionRows.length>=100)return;
       const tr=correctionRows[0].cloneNode(true);
       delete tr.dataset.sourceIndex;
       tr.removeAttribute('data-pos');tr.classList.remove('rlt-line-verified','rlt-line-attention');
       tr.querySelectorAll('input').forEach(field=>{field.value='';field.checked=false;});
       tr.querySelectorAll('small').forEach(el=>el.remove());
       tr.querySelector('[data-correct-class]').innerHTML='<option value="">Confirmar participação</option><option value="salao">SALÃO</option><option value="standby">STAND BY</option><option value="online">ON-LINE</option><option value="excluir">Excluir (após conferir)</option>';
       const index=correctionRows.length+1;
       tr.querySelector('[data-correct-position]').setAttribute('aria-label','Posição na folha do participante acrescentado '+index);
       tr.querySelector('[data-correct-number]').setAttribute('aria-label','Número sorteado do participante acrescentado '+index);
       tr.querySelector('[data-correct-name]').setAttribute('aria-label','Nome do participante acrescentado '+index);
       correctionRows.push(tr);human.querySelector('[data-review-rows]').append(tr);bindCorrectionRow(tr);refreshChecks();
       tr.querySelector('[data-correct-position]').focus();
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
         posicao_impressa:tr.querySelector('[data-correct-position]').value,
         numero_sorteado:tr.querySelector('[data-correct-number]').value,
         nome:tr.querySelector('[data-correct-name]').value,
         classe:tr.querySelector('[data-correct-class]').value
       }));
       const header={
         confirmEnterprise:human.querySelector('[data-review-enterprise]').checked,
         data:reviewDateBR(human.querySelector('[data-review-date]').value),
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
       learningCandidate=null;
       if(learning&&value.source==='ocr-space'&&googleSession?.authenticated){
         // Pair only unchanged, known physical positions from the same source
         // row; changing a physical position invalidates its learning evidence.
         const sourcePositions=new Map();
         for(const row of sorted)if(row.posicao_impressa!=null){const p=Number(row.posicao_impressa);sourcePositions.set(p,(sourcePositions.get(p)||0)+1);}
         const safeLines=[...human.querySelectorAll('[data-correction-row]')].flatMap(tr=>{
           const i=tr.dataset.sourceIndex;
           if(i===undefined)return [];
           const original=sorted[Number(i)];
           return original?.posicao_impressa!=null&&sourcePositions.get(Number(original.posicao_impressa))===1&&Number(tr.querySelector('[data-correct-position]').value)===Number(original.posicao_impressa)?[original]:[];
         });
         learningCandidate={account:googleSession.email,eventKey:learning.key(checked.payload),source:{...value,linhas:safeLines},directory:dto};
       }
       if(photoEvidence){
         photoEvidence.eventKey=JSON.stringify(value)===photoEvidence.draftJson?window.RoletaOcrLearning?.key(checked.payload):null;
         photoEvidence.reviewed=checked.payload;
       }
       canonicalInput.value=JSON.stringify(checked.payload,null,2);
       canonicalButton.click();
       errors.className='intake-gate clear';
       errors.innerHTML='<strong>ENVIADO À CONFERÊNCIA CANÔNICA</strong><div>Ainda é obrigatório revisar SALÃO, STAND BY, ON-LINE e confirmar a prévia para imprimir.</div>';
     });
   }
   if(!details.querySelector('[data-correction-row]'))throw Error('A leitura não criou linhas para conferência.');
  }catch(e){
   status.className='intake-gate blocked';
   status.innerHTML='<strong>LEITURA BLOQUEADA</strong><div>'+escapeHtml(e.message||e)+'</div>';
   throw e;
  }
 }
 article.querySelector('[data-gemini-check]').addEventListener('click',()=>{renderDraft().catch(()=>{});});
}
window.RoletaGeminiDraftUI={mount};
})();
