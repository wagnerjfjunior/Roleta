(function(){
'use strict';
const engine=window.RoletaSorteadorEngine;
const $=id=>document.getElementById(id);
const STORAGE='roleta-sorteador-historico-v1';
const MAX_RECORDS=100;
let records=[],current=null,busy=false,revealTimer=null,rollTimer=null,visualBalls=null,completionAudio=null;
const SOUND_KEY='roleta-sorteador-voz-v1';
let soundOn=false;
const speechAvailable=typeof window.speechSynthesis!=='undefined'&&typeof window.SpeechSynthesisUtterance!=='undefined';
function speak(message,onEnd){
 if(!soundOn||!speechAvailable){if(onEnd)onEnd();return;}
 try{
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(message);
  if(onEnd){let invoked=false;const finish=()=>{if(!invoked){invoked=true;onEnd();}};utterance.onend=finish;utterance.onerror=finish;}
  utterance.lang='pt-BR';utterance.rate=.83;utterance.pitch=1.04;utterance.volume=1;
  const voices=window.speechSynthesis.getVoices();
  const voice=voices.find(v=>v.lang.toLowerCase()==='pt-br')||voices.find(v=>v.lang.toLowerCase().startsWith('pt'));
  if(voice)utterance.voice=voice;
  window.speechSynthesis.speak(utterance);
 }catch(e){$('drawHint').textContent='A voz não está disponível neste dispositivo.';if(onEnd)onEnd();}
}
function prepareFinishAudio(){
 if(!soundOn||completionAudio)return;
 const AudioCtor=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtor)return;
 try{
  completionAudio=new AudioCtor();
  if(completionAudio.state==='suspended')completionAudio.resume().catch(()=>{});
 }catch{completionAudio=null;}
}
function playFinishChime(){
 if(!soundOn||!completionAudio||completionAudio.state!=='running')return;
 try{
  const ctx=completionAudio,now=ctx.currentTime;
  // Curta sequencia musical de encerramento, sem audio externo.
  [523.25,659.25,783.99,1046.5].forEach((freq,i)=>{
   const start=now+i*.17,end=start+.29;
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(freq,start);
   gain.gain.setValueAtTime(.0001,start);
   gain.gain.exponentialRampToValueAtTime(.12,start+.024);
   gain.gain.exponentialRampToValueAtTime(.0001,end);
   osc.connect(gain);gain.connect(ctx.destination);
   osc.start(start);osc.stop(end+.02);
  });
 }catch{/* Ausencia de audio nao altera o resultado. */}
}
function updateSoundButton(){
 const button=$('soundToggle');if(!button)return;
 button.disabled=!speechAvailable;
 button.setAttribute('aria-pressed',String(soundOn));
 button.textContent=!speechAvailable?'🔇 Voz indisponível':soundOn?'🔊 Som ligado':'🔇 Som desligado';
 button.title=soundOn?'Desativar anúncio de voz dos números':'Ativar anúncio de voz dos números';
}
function setSound(enabled){
 soundOn=!!enabled&&speechAvailable;
 try{localStorage.setItem(SOUND_KEY,soundOn?'1':'0');}catch{}
 if(!soundOn&&speechAvailable)window.speechSynthesis.cancel();
 updateSoundButton();
 if(soundOn){prepareFinishAudio();speak('Som ativado. Próxima bolinha.');}
}
const fmt=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium'});
function formatDate(value){try{return fmt.format(new Date(value));}catch{return 'Data indisponível';}}
function showError(message){$('drawHint').textContent=message;$('drawHint').classList.add('error');}
function clearError(){$('drawHint').classList.remove('error');}
function readRecords(){
 try{
  const raw=JSON.parse(localStorage.getItem(STORAGE)||'[]');
  if(!Array.isArray(raw))throw Error('Formato inválido');
  return raw.filter(r=>{
   try{
    if(typeof r.id!=='string'||typeof r.createdAt!=='string')return false;
    remainingFor(r);
    return r.draws.every((d,i)=>d.position===i+1&&Number.isFinite(Date.parse(d.at)));
   }catch{return false;}
  }).slice(0,MAX_RECORDS);
 }catch{
  return [];
 }
}
function persist(nextRecords){
 try{localStorage.setItem(STORAGE,JSON.stringify(nextRecords));records=nextRecords;return true;}
 catch{
  alert('O navegador não conseguiu salvar o histórico local. Verifique o armazenamento antes de sortear.');
  return false;
 }
}
function canRun(){
 if(!engine||typeof crypto==='undefined'||typeof crypto.getRandomValues!=='function'){
  $('startForm').querySelector('button[type=submit]').disabled=true;
  $('total').disabled=true;$('firstNumber').disabled=true;$('lastNumber').disabled=true;
  $('setup').querySelector('small').textContent='Este navegador não oferece aleatoriedade criptográfica segura. Utilize um navegador atualizado em localhost ou HTTPS.';
  return false;
 }
 try{const key='roleta-sorteador-teste';localStorage.setItem(key,'1');localStorage.removeItem(key);return true;}
 catch{
  $('startForm').querySelector('button[type=submit]').disabled=true;
  $('setup').querySelector('small').textContent='Histórico local indisponível. Autorize o armazenamento deste site no navegador.';
  return false;
 }
}
function countText(n){return n===1?'1 bolinha':n+' bolinhas';}
function isRange(r){return r.mode==='range';}
function remainingFor(r){return isRange(r)?engine.remainingRange(r.first,r.last,r.draws):engine.remaining(r.total,r.draws);}
function nextFor(r){return isRange(r)?engine.nextRange(r.first,r.last,r.draws,crypto):engine.next(r.total,r.draws,crypto);}
function description(r){return isRange(r)?'Do número '+r.first+' até '+r.last:r.total+' corretores';}
function showSession(record){
 if(revealTimer){clearTimeout(revealTimer);revealTimer=null;}
 if(rollTimer){clearTimeout(rollTimer);rollTimer=null;}
 if(visualBalls){visualBalls.destroy();visualBalls=null;}
 $('arena').classList.remove('speed-up');
 if(speechAvailable)window.speechSynthesis.cancel();
 busy=false;current=record;
 $('setup').hidden=true;$('session').hidden=false;
 $('sessionLabel').textContent=description(record)+' · '+(record.draws.length===record.total?'Concluído':'Em andamento');
 $('sequenceDescription').textContent=isRange(record)?'Cada retirada entra na sequência abaixo, com seu horário.':'1ª bolinha para a posição física 1, 2ª para a posição física 2, e assim por diante.';
 $('sessionTime').textContent='Iniciado em '+formatDate(record.createdAt);
 renderSession(true);
 // Ball remains keyboard-accessible; avoid stealing scroll/focus on session recovery.
}
function drawPool(){
 const pool=remainingFor(current);
 const arena=$('arena');
 if(window.RoletaBingoBalls){
  if(!visualBalls)visualBalls=window.RoletaBingoBalls.create(arena);
 }
 if(visualBalls){
  visualBalls.update(pool);
 }else{
  // Fallback estatico/animado caso Canvas nao esteja disponivel.
  const fragment=document.createDocumentFragment();
  for(const n of pool){
   const b=document.createElement('span');
   b.className='ball';b.textContent='';
   b.setAttribute('aria-hidden','true');
   const i=n-1,ring=Math.sqrt((i+.5)/current.total),angle=i*2.399963229728653;
   b.style.setProperty('--x',(50+ring*45*Math.cos(angle)).toFixed(3)+'%');
   b.style.setProperty('--y',(50+ring*38*Math.sin(angle)).toFixed(3)+'%');
   b.style.setProperty('--i',String(i%7));fragment.appendChild(b);
  }
  arena.replaceChildren(fragment);
 }
 $('poolLabel').textContent=countText(pool.length)+' na urna';
}
function renderSession(resetWinner){
 if(!current)return;
 const drawn=current.draws.length,total=current.total;
 $('sessionLabel').textContent=description(current)+' · '+(drawn===total?'Concluído':'Em andamento');
 $('progressText').textContent=drawn+' de '+total+' sorteadas';
 $('remainingText').textContent=countText(total-drawn)+' restantes';
 $('progressFill').style.width=(100*drawn/total)+'%';
 $('progressBar').setAttribute('aria-valuenow',String(Math.round(100*drawn/total)));
 $('resultCount').textContent=drawn+' de '+total;
 const list=$('sequence');const fragment=document.createDocumentFragment();
 current.draws.forEach(entry=>{
  const li=document.createElement('li');li.className='sequence-item';
  const position=document.createElement('span');position.className='position';position.textContent=entry.position+'ª posição';
  const number=document.createElement('strong');number.className='sequence-number';number.textContent=entry.number;
  const time=document.createElement('time');time.dateTime=entry.at;time.textContent=new Date(entry.at).toLocaleTimeString('pt-BR');
  if(isRange(current))position.textContent=entry.position+'ª retirada';
  li.append(position,number,time);fragment.appendChild(li);
 });
 list.replaceChildren(fragment);
 $('emptySequence').hidden=drawn>0;
 $('finishBanner').hidden=drawn!==total;
 $('drawMotionLabel').textContent=drawn===total?'Sorteio concluído':'Bolinhas em movimento';
 $('session').classList.toggle('session-complete',drawn===total);
 $('sessionEyebrow').textContent=drawn===total?'SORTEIO CONCLUÍDO':'SORTEIO EM ANDAMENTO';
 drawPool();
 const button=$('drawButton');
 button.disabled=busy||drawn===total;
 $('winnerCta').textContent=drawn===total?'Sorteio concluído':'Toque para sortear';
 button.setAttribute('aria-label',drawn===total?'Sorteio concluído':'Sortear próxima bolinha');
 if(resetWinner){
  $('drawButton').classList.remove('revealing');
  if(drawn){
   const last=current.draws[drawn-1];
   $('winnerCaption').textContent=drawn===total?'Última bolinha sorteada':'Bolinha sorteada';
   $('winnerNumber').textContent=last.number;
   $('winnerNumber').classList.add('has-drawn-number');
   $('winnerPosition').textContent=last.position+(isRange(current)?'ª retirada':'ª posição física');
  }else{
   $('winnerCaption').textContent='Pronto para sortear';
   $('winnerNumber').textContent='?';
   $('winnerNumber').classList.remove('has-drawn-number');
   $('winnerPosition').textContent=isRange(current)?'Aguardando a primeira bolinha':'Aguardando a primeira posição';
  }
  clearError();
  $('drawHint').textContent=drawn===total?'Sequência completa. O histórico foi salvo neste navegador.':'Cada clique revela uma bolinha ainda não sorteada.';
 }
}
function draw(){
 if(!current||busy||current.draws.length>=current.total)return;
 prepareFinishAudio();
 const number=nextFor(current);
 const position=current.draws.length+1;
 const entry={position,number,at:new Date().toISOString()};
 const updated={...current,draws:[...current.draws,entry]};
 const next=records.map(r=>r.id===updated.id?updated:r);
 if(!persist(next))return;
 current=updated;busy=true;
 $('drawButton').disabled=true;
 $('drawButton').classList.remove('revealing');
 $('drawButton').classList.add('is-rolling');
 $('winnerCta').textContent='Sorteando…';
 $('winnerCaption').textContent=isRange(current)?'Sorteando bolinha':'Sorteando para a posição '+position;
 $('winnerNumber').textContent='—';
 $('winnerNumber').classList.add('has-drawn-number');
 $('winnerPosition').textContent='Aguarde a revelação';
 $('drawHint').textContent='Preparando a próxima bolinha…';
 $('arena').classList.add('speed-up');
 if(visualBalls)visualBalls.setFast(true);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=reduced?0:1100;
 const preview=remainingFor({...current,draws:current.draws.slice(0,-1)});
 const begun=performance.now();
 function roll(){
  if(!busy)return;
  const elapsed=performance.now()-begun;
  if(elapsed>=duration)return;
  const sample=preview[Math.floor(Math.random()*preview.length)];
  $('winnerNumber').textContent=String(sample);
  const ratio=elapsed/duration;
  rollTimer=setTimeout(roll,ratio<.60?42:ratio<.82?85:140);
 }
 if(duration>0)roll();
 revealTimer=setTimeout(()=>{
  revealTimer=null;
  if(rollTimer){clearTimeout(rollTimer);rollTimer=null;}
  $('drawButton').classList.remove('is-rolling');
  $('arena').classList.remove('speed-up');
  if(visualBalls)visualBalls.setFast(false);
  busy=false;
  renderSession(false);
  $('drawButton').classList.add('revealing');
  $('winnerCaption').textContent='Bolinha sorteada';
  $('winnerNumber').textContent=number;
  $('winnerCta').textContent=current.draws.length===current.total?'Sorteio concluído':'Toque para sortear';
  $('winnerPosition').textContent=position+(isRange(current)?'ª retirada':'ª posição física');
  if(current.draws.length===current.total)speak(String(number),playFinishChime);
  else speak(String(number));
  $('drawHint').textContent=current.draws.length===current.total?'Sorteio finalizado. Todos os números estão registrados abaixo.':'Clique novamente para a próxima posição.';
  clearError();
 },duration);
}
function start(config){
 if(current&&current.draws.length<current.total){
  if(!confirm('O sorteio atual ainda não terminou. Deseja iniciar outro? O parcial continuará no histórico local.'))return;
 }
 const record={id:crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-'),createdAt:new Date().toISOString(),...config,draws:[]};
 if(!persist([record,...records].slice(0,MAX_RECORDS)))return;
 showSession(record);
}
function renderHistory(){
 const host=$('historyList');host.replaceChildren();
 if(records.length===0){const p=document.createElement('p');p.className='empty';p.textContent='Ainda não há sorteios neste navegador.';host.appendChild(p);return;}
 for(const r of records){
  const row=document.createElement('article');row.className='history-row';
  const heading=document.createElement('div');heading.className='history-row-heading';
  const label=document.createElement('strong');label.textContent=description(r)+' · '+r.draws.length+'/'+r.total+(r.draws.length===r.total?' concluído':' parcial');
  const date=document.createElement('small');date.textContent=formatDate(r.createdAt);
  heading.append(label,date);
  const seq=document.createElement('p');seq.textContent=r.draws.length?r.draws.map(d=>d.position+'ª: '+d.number).join(' · '):'Nenhuma bolinha sorteada';
  const action=document.createElement('button');action.type='button';action.className='history-open';action.textContent=r.draws.length===r.total?'Ver resultado':'Continuar sorteio';
  action.addEventListener('click',()=>{if(busy)return;showSession(r);$('historyDialog').close();});
  row.append(heading,seq,action);host.appendChild(row);
 }
}
function openHistory(){renderHistory();$('historyDialog').showModal();}
$('soundToggle').addEventListener('click',()=>setSound(!soundOn));
try{soundOn=localStorage.getItem(SOUND_KEY)==='1'&&speechAvailable;}catch{}
updateSoundButton();
const modeInputs=[...document.querySelectorAll('input[name="drawMode"]')];
function activeMode(){return modeInputs.find(r=>r.checked)?.value||'count';}
function updateMode(){
 const range=activeMode()==='range';
 $('countFields').hidden=range;$('rangeFields').hidden=!range;
 $('total').disabled=range;$('firstNumber').disabled=!range;$('lastNumber').disabled=!range;
 updateSetupSummary();
}
function updateSetupSummary(){
 try{
  if(activeMode()==='range'){
   const v=engine.assertRange(Number($('firstNumber').value),Number($('lastNumber').value));
   $('setupSummary').textContent=v.total+' bolinhas, numeradas de '+v.first+' até '+v.last+'.';
  }else{
   const total=engine.assertTotal(Number($('total').value));
   $('setupSummary').textContent=total+' bolinhas, numeradas de 1 a '+total+'.';
  }
  $('setupSummary').classList.remove('error');
 }catch(e){$('setupSummary').textContent=e.message;$('setupSummary').classList.add('error');}
}
modeInputs.forEach(r=>r.addEventListener('change',updateMode));
['total','firstNumber','lastNumber'].forEach(id=>$(id).addEventListener('input',updateSetupSummary));
updateMode();
$('startForm').addEventListener('submit',event=>{
 event.preventDefault();
 if(!canRun())return;
 try{
  if(activeMode()==='range'){
   const {first,last,total}=engine.assertRange(Number($('firstNumber').value),Number($('lastNumber').value));
   start({mode:'range',first,last,total});
  }else start({mode:'count',total:engine.assertTotal(Number($('total').value))});
 }
 catch(e){alert(e.message);}
});
$('drawButton').addEventListener('click',()=>{
 try{draw();}catch(e){showError(e.message||'Não foi possível sortear.');}
});
$('newButton').addEventListener('click',()=>{
 if(busy)return;
 if(current&&current.draws.length<current.total&&!confirm('Deseja sair deste sorteio parcial? Ele ficará no histórico local.'))return;
 if(visualBalls){visualBalls.destroy();visualBalls=null;}
 if(speechAvailable)window.speechSynthesis.cancel();
 current=null;$('session').hidden=true;$('setup').hidden=false;
 $('total').focus();
});
$('historyButton').addEventListener('click',openHistory);
$('closeHistory').addEventListener('click',()=>$('historyDialog').close());
$('doneHistory').addEventListener('click',()=>$('historyDialog').close());
$('clearHistory').addEventListener('click',()=>{
 if(records.length===0)return;
 if(!confirm('Apagar todos os sorteios armazenados neste navegador? Esta ação não pode ser desfeita.'))return;
 if(!persist([]))return;
 if(visualBalls){visualBalls.destroy();visualBalls=null;}
 if(speechAvailable)window.speechSynthesis.cancel();
 current=null;$('session').hidden=true;$('setup').hidden=false;renderHistory();
});
records=readRecords();
if(canRun()){
 const latest=records[0];
 if(latest&&latest.draws.length<latest.total)showSession(latest);
}
})();
