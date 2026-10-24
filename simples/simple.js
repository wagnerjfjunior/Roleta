(function(){
'use strict';
const host=document.getElementById('simpleIntake');
const entry=document.getElementById('simpleEntry'),home=document.getElementById('simpleHome'),workflow=document.getElementById('simpleWorkflow');
const menu=document.getElementById('simpleMenuButton'),access=document.getElementById('simpleSessionStatus');
const loginEntry=document.getElementById('simpleLogin'),retry=document.getElementById('simpleRetry');
const localButton=document.getElementById('simpleLocalTest');
const isLocal=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
let authenticated=false,localTest=false;
function route(){
 const permitted=authenticated||(isLocal&&localTest);
 const digital=permitted&&location.hash==='#digitalizar';
 document.body.classList.toggle('simple-screen-entry',!permitted);
 entry.hidden=permitted;home.hidden=!permitted||digital;workflow.hidden=!digital;
 menu.hidden=!digital;
 if(digital)update();
}
menu.addEventListener('click',()=>{location.hash='';});
window.addEventListener('hashchange',route);
localButton.addEventListener('click',()=>{if(!isLocal)return;localTest=true;document.getElementById('simpleUser').textContent='Teste local da interface. O envio de fotos exige uma sessão Google válida no servidor.';route();});
async function checkAccess(){
 retry.hidden=true;access.textContent='Verificando seu acesso…';
 try{
  const response=await fetch('/api/auth/session',{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error('session unavailable');
  const result=await response.json();authenticated=result.authenticated===true;
  access.textContent=authenticated?'Acesso confirmado.':'Use uma conta Google autorizada para continuar.';
  document.getElementById('simpleUser').textContent=authenticated?'Conectado como '+result.email:'';
 }catch{
  authenticated=false;access.textContent=isLocal?'O Live Sync local não executa o login Google. Você pode testar a interface; o processamento continua protegido.':'Não foi possível verificar seu acesso. Tente novamente.';
  retry.hidden=false;
 }
 localButton.hidden=!isLocal;loginEntry.hidden=authenticated;route();
 if(authenticated)refreshSavedOption();
}

// The cloud ledger already contains fully confirmed sheets; open them directly as outputs.
const recoverSaved=document.createElement('button');
recoverSaved.type='button';
recoverSaved.className='simple-primary simple-recover-saved';
recoverSaved.textContent='Recuperar última roleta salva';
recoverSaved.hidden=true;
const recoveryMessage=document.createElement('p');
recoveryMessage.className='simple-access-note';
recoveryMessage.setAttribute('role','status');
recoveryMessage.hidden=true;
home.append(recoverSaved,recoveryMessage);
const recoverDuringDigitization=recoverSaved.cloneNode(true);
recoverDuringDigitization.removeAttribute('id');
recoverDuringDigitization.textContent='Recuperar roleta salva';
recoverDuringDigitization.hidden=true;
const recoveryInWorkflow=document.createElement('p');
recoveryInWorkflow.className='simple-access-note';
recoveryInWorkflow.setAttribute('role','status');
recoveryInWorkflow.hidden=true;
const workflowHeading=workflow.querySelector('.simple-workflow-heading');
workflowHeading?.insertAdjacentElement('afterend',recoverDuringDigitization);
recoverDuringDigitization.insertAdjacentElement('afterend',recoveryInWorkflow);
async function fetchSavedFinals(){
 const response=await fetch('/api/final-roulette',{credentials:'same-origin',cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!Array.isArray(data.records))throw Error(data.error||'Histórico indisponível.');
 return data.records.filter(r=>r&&r.payload&&r.payload.reviewed&&Number.isSafeInteger(r.version)).sort((a,b)=>Date.parse(b.recorded_at||0)-Date.parse(a.recorded_at||0));
}
async function refreshSavedOption(){
 if(!authenticated){recoverSaved.hidden=true;recoverDuringDigitization.hidden=true;return;}
 try{
  const records=await fetchSavedFinals();
  recoverSaved.hidden=!records.length;
  recoverDuringDigitization.hidden=!records.length;
  recoverSaved.dataset.available=String(records.length);
 }catch(e){recoverSaved.hidden=false;recoverDuringDigitization.hidden=false;recoveryMessage.textContent='Não foi possível consultar o histórico: '+String(e.message||e);recoveryMessage.hidden=false;}
}
async function openSavedFinal(){
 recoverSaved.disabled=true;recoveryMessage.hidden=false;
 recoveryMessage.textContent='Abrindo a última folha já conferida...';
 try{
  const records=await fetchSavedFinals();
  // Sort by recorded_at; server ledger itself is ordered by event identifier.
  if(!records.length)throw Error('Não há roletas salvas no histórico.');
  const latest=records[0];
  const transfer={record:latest,promise:Promise.resolve()};
  host.dispatchEvent(new CustomEvent('roleta-open-saved-final',{detail:transfer}));
  await transfer.promise;
  location.hash='#digitalizar';
  recoveryMessage.textContent='Folha final recuperada.';
  recoveryInWorkflow.textContent='Folha final recuperada.';
 }catch(e){recoveryMessage.textContent=String(e.message||e);recoveryInWorkflow.textContent=String(e.message||e);recoveryInWorkflow.hidden=false;}
 finally{recoverSaved.disabled=false;recoverDuringDigitization.disabled=false;}
}
recoverSaved.addEventListener('click',openSavedFinal);
recoverDuringDigitization.addEventListener('click',openSavedFinal);

const notice=document.getElementById('simpleNotice');
if(!host||!window.RouletteIntake){
 if(notice)notice.textContent='O aplicativo não carregou. Atualize a página.';
 return;
}
try{window.RouletteIntake.mount(host);}
catch(e){notice.textContent='Erro ao iniciar o aplicativo: '+String(e.message||e);return;}
const photo=host.querySelector('[data-photo-camera]')?.closest('article');
const manual=host.querySelector('#rltv2Json')?.closest('article');
const review=host.querySelector('#rltv2ReviewCard');
const preview=host.querySelector('#rltv2PreviewCard');
if(!photo||!review||!preview){
 notice.textContent='Os módulos operacionais não carregaram. Verifique o console e atualize a página.';
 return;
}
// O cartão da câmera e o cartão do JSON compartilham a classe rltv2-import-card.
// Ocultar por essa classe quebrava completamente os botões de câmera e galeria.
photo.classList.add('simple-photo-card');
if(manual)manual.classList.add('simple-manual-import');
const human=photo.querySelector('[data-gemini-detail]');
const header=photo.querySelector('h2');
if(header)header.textContent='Fotografar a roleta';
const intro=photo.querySelector('p.small.muted');
if(intro)intro.textContent='Escolha uma foto nítida. Confira a folha e toque em Processar foto.';
const source=photo.querySelector('h3');
if(source)source.textContent='Como deseja enviar?';
const camera=photo.querySelector('[data-photo-camera]');
const gallery=photo.querySelector('[data-photo-gallery]');
if(camera)camera.textContent='Tirar foto';
if(gallery)gallery.textContent='Escolher da galeria';
const login=photo.querySelector('[data-google-login]');
if(login)login.parentElement.classList.add('simple-auth-controls');
const send=photo.querySelector('[data-photo-send]');
if(send)send.textContent='Processar foto';
const transfer=()=>photo.querySelector('[data-review-transfer]');
const stepLabel=document.getElementById('simpleStepLabel');
const stepProgress=document.getElementById('simpleStepProgress');
const photoPreview=photo.querySelector('[data-photo-preview]');
const confirmation=photo.querySelector('[data-photo-confirm]');
if(confirmation){confirmation.parentElement.lastChild.textContent=' A folha está na posição correta e os nomes e números estão legíveis.';}
const remove=photo.querySelector('[data-photo-remove]');if(remove)remove.textContent='Trocar foto';
const rotate=document.createElement('button');rotate.type='button';rotate.dataset.photoRotate='';rotate.textContent='Girar foto';
if(send)send.parentElement.insertBefore(rotate,send);
const tools=document.createElement('div');tools.className='simple-review-tools';tools.hidden=true;
const referenceButton=document.createElement('button');referenceButton.type='button';referenceButton.className='simple-back';referenceButton.textContent='Ver foto da folha';
const nextPending=document.createElement('button');nextPending.type='button';nextPending.className='simple-back';nextPending.textContent='Próxima linha pendente';
tools.append(referenceButton,nextPending);human.before(tools);
const reference=document.createElement('aside');reference.className='simple-photo-reference';reference.hidden=true;
const refTitle=document.createElement('h3');refTitle.textContent='Foto da folha';
const refImg=document.createElement('img');refImg.alt='Fotografia original para comparar com os participantes';
const refControls=document.createElement('div');refControls.className='simple-reference-controls';
const closeRef=document.createElement('button');closeRef.type='button';closeRef.textContent='Ocultar foto';
const zoomRef=document.createElement('button');zoomRef.type='button';zoomRef.textContent='Ampliar foto';zoomRef.setAttribute('aria-pressed','false');
refControls.append(zoomRef,closeRef);reference.append(refTitle,refControls,refImg);human.before(reference);
referenceButton.setAttribute('aria-expanded','false');
function showReference(show){if(reference.hidden===show)reference.hidden=!show;if(referenceButton.getAttribute('aria-expanded')!==String(show))referenceButton.setAttribute('aria-expanded',String(show));if(host.classList.contains('simple-with-reference')!==show)host.classList.toggle('simple-with-reference',show);}
referenceButton.addEventListener('click',()=>showReference(reference.hidden));closeRef.addEventListener('click',()=>showReference(false));
zoomRef.addEventListener('click',()=>{const zoom=zoomRef.getAttribute('aria-pressed')!=='true';zoomRef.setAttribute('aria-pressed',String(zoom));zoomRef.textContent=zoom?'Reduzir foto':'Ampliar foto';reference.classList.toggle('simple-reference-zoom',zoom);});
nextPending.addEventListener('click',()=>{const row=[...human.querySelectorAll('[data-correction-row]')].find(r=>!r.querySelector('[data-correct-confirm]').checked);if(row){row.scrollIntoView({block:'center',behavior:'auto'});row.querySelector('[data-correct-name]').focus({preventScroll:true});}});
let referenceOpened=false;

const finalTitle=preview.querySelector('h2');
if(finalTitle)finalTitle.textContent='Roleta conferida';
const print=host.querySelector('#rltv2Print');
if(print)print.textContent='Imprimir';
const pdf=host.querySelector('#rltv2SavePdf');
if(pdf)pdf.textContent='Salvar PDF';
const share=host.querySelector('#rltv2SharePdf');
if(share)share.textContent='Compartilhar JPEG';
const saveHistory=host.querySelector('#rltStatSubmit');
if(saveHistory)saveHistory.textContent='Salvar roleta no histórico';
const outputsNote=document.createElement('p');outputsNote.className='simple-output-note';outputsNote.textContent='Imprimir, baixar e compartilhar não salvam a roleta no histórico. Use a ação de salvar quando quiser registrar a folha conferida.';preview.append(outputsNote);

// Explicit end-of-work controls. No Make or Supabase deletion.
const endActions=document.createElement('div');
endActions.className='intake-actions';
const newRoleta=document.createElement('button');
newRoleta.type='button';newRoleta.className='simulation-run simple-end-new';newRoleta.textContent='Nova Roleta';
const discardRoleta=document.createElement('button');
discardRoleta.type='button';discardRoleta.className='simulation-run simple-end-discard';discardRoleta.textContent='Descartar Roleta';
endActions.append(newRoleta,discardRoleta);
preview.append(endActions);
let finalSaved=false,ending=false;
host.addEventListener('roleta-final-saved',event=>{
 if(['saved','replayed'].includes(event.detail?.status))finalSaved=true;
});
async function endCurrent(discard){
 if(ending)return;
 if(host.querySelector('#rltStatStatus')?.textContent==='Salvando a folha conferida no Supabase.')return;
 const message=finalSaved
   ?(discard?'Descartar apenas os dados temporários deste dispositivo? A roleta salva no histórico será preservada.':'Iniciar uma nova roleta? A roleta salva no histórico será preservada.')
   :'Esta roleta ainda não foi salva no histórico. Descartar definitivamente a fotografia e as correções locais deste dispositivo? O processamento no Make e os registros do Supabase não serão apagados.';
 if(!window.confirm(message))return;
 ending=true;newRoleta.disabled=true;discardRoleta.disabled=true;
 try{
   const local={promise:Promise.resolve()};
   host.dispatchEvent(new CustomEvent('roleta-discard-local',{detail:local}));
   await local.promise;
   const canonical={promise:Promise.resolve()};
   host.dispatchEvent(new CustomEvent('roleta-discard-canonical',{detail:canonical}));
   await canonical.promise;
   // Reload only after deletion; otherwise recovery remains possible.
   location.replace(location.pathname+location.search);
 }catch(error){
   notice.textContent='Não foi possível encerrar o rascunho local com segurança. Tente novamente.';
   ending=false;newRoleta.disabled=false;discardRoleta.disabled=false;
 }
}
newRoleta.addEventListener('click',()=>endCurrent(false));
discardRoleta.addEventListener('click',()=>endCurrent(true));

// Review-stage controls: returning to menu preserves local work; discard is explicit.
const reviewExit=document.createElement('div');
reviewExit.className='intake-actions simple-review-exit';
const backToMenu=document.createElement('button');
backToMenu.type='button';backToMenu.className='simulation-run simple-back-menu';backToMenu.textContent='Voltar ao menu';
const abandonReview=document.createElement('button');
abandonReview.type='button';abandonReview.className='simulation-run simple-end-discard';abandonReview.textContent='Cancelar e descartar';
reviewExit.append(backToMenu,abandonReview);
const heading=workflow.querySelector('.simple-workflow-heading');
if(heading)heading.insertAdjacentElement('afterend',reviewExit);else workflow.prepend(reviewExit);
backToMenu.addEventListener('click',()=>{
 location.hash='';
});
abandonReview.addEventListener('click',()=>endCurrent(true));

const apply=host.querySelector('#rltv2ApplyReview');
if(apply)apply.textContent='Validar folha final';
let phase=0;
function update(){
 const isFinal=!preview.hidden;
 // Keep navigation actions available throughout the workflow, even before OCR completes.
 const isCanonical=!review.hidden;
 const isHuman=!!transfer();
 const next=isFinal?4:isCanonical?3:isHuman?2:1;
 if(next!==phase){
   phase=next;
   host.dataset.simplePhase=String(phase);
   stepLabel.textContent='Etapa '+phase+' de 4 · '+['Foto da folha','Conferir participantes','Revisar folha','Roleta pronta'][phase-1];
   stepProgress.value=phase;
   if(next===1)notice.textContent='Comece pela foto da folha.';
   else if(next===2)notice.textContent='Confira os nomes e as bolinhas na fotografia. Marque cada linha revisada.';
   else if(next===3)notice.textContent='Confira SALÃO, STAND-BY, ON-LINE e o sorteio de empresa.';
   else notice.textContent='Confirme a folha final para liberar impressão, JPEG e compartilhamento.';
 }
 const button=transfer();
 if(button&&button.textContent!=='Continuar para a folha final')button.textContent='Continuar para a folha final';
 const hideTools=!isHuman||isCanonical||isFinal;if(tools.hidden!==hideTools)tools.hidden=hideTools;
 if(photoPreview?.getAttribute('src')&&refImg.getAttribute('src')!==photoPreview.getAttribute('src'))refImg.src=photoPreview.src;
 if(isHuman&&!isCanonical&&!isFinal&&!referenceOpened&&refImg.getAttribute('src')){referenceOpened=true;showReference(true);}
 if(!isHuman||isCanonical||isFinal)showReference(false);
 const rotationBlocked=!!remove?.disabled;if(rotate.disabled!==rotationBlocked)rotate.disabled=rotationBlocked;
 if(isHuman){
   const section=human.querySelector('.rltv2-review-card');
   if(section&&!section.classList.contains('simple-human-review'))section.classList.add('simple-human-review');
   const title=section?.querySelector('h3');if(title&&title.textContent!=='Confira os participantes')title.textContent='Confira os participantes';
 }
 const authIndicator=photo.querySelector('[data-google-auth]');
 if(authenticated&&!isLocal&&authIndicator?.textContent==='Entre com Google para enviar fotografias.'){
   authenticated=false;access.textContent='Sua sessão terminou. Entre com Google para continuar.';loginEntry.hidden=false;route();
 }
 const initialPhotoStatus=photo.querySelector('[data-photo-status]');
 const initialPhotoText=initialPhotoStatus?.querySelector('div');
 if(initialPhotoText?.textContent==='Faça login com Google, selecione uma foto e confirme o enquadramento.')initialPhotoText.textContent='Selecione a foto e confirme que os nomes e números estão legíveis.';
 const readingStatus=photo.querySelector('[data-gemini-status]');
 const waiting=readingStatus?.textContent==='AGUARDANDO JSON DO GEMINI'||readingStatus?.textContent==='Aguardando a foto da folha';
 if(readingStatus&&readingStatus.hidden!==waiting)readingStatus.hidden=waiting;
 const translations=new Map([
  ['AGUARDANDO JSON DO GEMINI','Aguardando a foto da folha'],
  ['CONFERÊNCIA PENDENTE','Confira a foto antes de continuar'],
  ['FOTOGRAFIA PRONTA','Confira a foto'],
  ['RASCUNHO NÃO APROVADO','Leitura recebida · confira os participantes'],
  ['TRANSFERÊNCIA NÃO AUTORIZADA','Ainda há dados para conferir']
 ]);
 photo.querySelectorAll('[data-photo-status] strong,[data-gemini-status] strong,[data-review-errors] strong').forEach(el=>{const text=translations.get(el.textContent);if(text)el.textContent=text;});
 const status=photo.querySelector('[data-photo-status]');
 if(status&&status.textContent.includes('ENVIO NÃO CONCLUÍDO'))notice.textContent='A leitura falhou. Veja o motivo abaixo e tente novamente.';
}
const obs=new MutationObserver(update);
retry.addEventListener('click',checkAccess);
checkAccess();
obs.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','class','src']});
update();
})();