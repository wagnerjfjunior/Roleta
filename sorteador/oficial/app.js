(function(){
'use strict';
const $=id=>document.getElementById(id);
let token='',session=null,working=false;
const sessionKey='roleta-sorteador-oficial-sessao';
function notify(message){$('globalStatus').textContent=message;}
function setBusy(value){working=value;['start','draw','refresh'].forEach(id=>$(id).disabled=value);}
function selectedMode(){return document.querySelector('input[name="drawMode"]:checked').value;}
function adjustMode(){const range=selectedMode()==='range';$('countFields').hidden=range;$('rangeFields').hidden=!range;}
async function request(method,body,sessionId,mode){
 const url='/api/secure-draw'+(sessionId?'?sessionId='+encodeURIComponent(sessionId):mode==='list'?'?list=1':'');
 const options={method,cache:'no-store',headers:{Authorization:'Bearer '+token,Accept:'application/json'}};
 if(body){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
 let response;
 try{response=await fetch(url,options);}catch{throw Error('Sem conexão. Consulte o servidor antes de tentar sortear novamente.');}
 let data;try{data=await response.json();}catch{throw Error('Resposta inválida do servidor.');}
 if(!response.ok)throw Error(data.error||'Falha no servidor.');
 return data;
}
function render(s){
 session=s;$('session').hidden=false;$('operations').hidden=false;
 $('sessionHeading').textContent=s.draws.length===s.total?'Sorteio concluído':'Sorteio em andamento';
 $('sessionMeta').textContent=(s.mode==='range'?'De '+s.first+' até '+s.last:s.total+' corretores')+' · '+s.draws.length+' de '+s.total+' números';
 $('lastNumberDrawn').textContent=s.draws.length?s.draws[s.draws.length-1].number:'—';
 $('finish').hidden=s.draws.length!==s.total;
 $('draw').disabled=working||s.draws.length===s.total;
 $('sequence').replaceChildren();
 for(const d of s.draws){const li=document.createElement('li'),label=document.createElement('small'),n=document.createElement('strong');label.textContent=d.position+'ª retirada';n.textContent=d.number;li.append(label,n);$('sequence').append(li);}
 $('sessionStatus').textContent='Registro oficial confirmado. Identificador: '+s.id;
 try{sessionStorage.setItem(sessionKey,s.id);}catch{}
}
async function safe(operation){
 if(working)return;
 setBusy(true);notify('');
 try{await operation();}
 catch(err){notify(err.message||'Falha na operação.');}
 finally{setBusy(false);if(session)$('draw').disabled=session.draws.length===session.total;}
}
$('authForm').addEventListener('submit',event=>{
 event.preventDefault();
 const value=$('accessKey').value.trim();
 if(value.length<32){$('authStatus').textContent='Informe uma chave válida.';return;}
 token=value;$('accessKey').value='';
 $('authStatus').textContent='Chave mantida somente na memória. Autorizações serão verificadas pelo servidor.';
 $('forget').disabled=false;
 $('operations').hidden=false;
 let id;try{id=sessionStorage.getItem(sessionKey);}catch{}
 if(id)safe(async()=>{const result=await request('GET',null,id);render(result.session);notify('Sessão anterior carregada do servidor.');});
});
$('forget').addEventListener('click',()=>{
 token='';session=null;$('operations').hidden=true;$('session').hidden=true;
 $('forget').disabled=true;$('authStatus').textContent='Acesso encerrado nesta página.';
 notify('Chave descartada da memória.'); 
});
document.querySelectorAll('input[name="drawMode"]').forEach(r=>r.addEventListener('change',adjustMode));
adjustMode();
$('start').addEventListener('click',()=>safe(async()=>{
 if(session&&session.draws.length<session.total&&!confirm('O sorteio anterior continuará registrado no servidor. Iniciar outro?'))return;
 const body={action:'start',requestId:crypto.randomUUID(),mode:selectedMode()};
 if(body.mode==='count')body.total=Number($('total').value);
 else{body.first=Number($('firstNumber').value);body.last=Number($('lastNumber').value);}
 const r=await request('POST',body);render(r.session);notify('Novo sorteio registrado no servidor.');
}));
$('showHistory').addEventListener('click',()=>safe(async()=>{
 const r=await request('GET',null,null,'list');
 const host=$('serverHistory');host.replaceChildren();host.hidden=false;
 if(!r.sessions.length){host.textContent='Nenhum sorteio registrado para este operador.';return;}
 for(const s of r.sessions){
  const item=document.createElement('button');item.type='button';item.className='history-entry quiet';
  item.textContent=(s.mode==='range'?'De '+s.first_number+' até '+s.last_number:s.total+' corretores')+
   ' · '+new Date(s.created_at).toLocaleString('pt-BR')+(s.finished_at?' · Concluído':' · Em andamento');
  item.addEventListener('click',()=>safe(async()=>{const result=await request('GET',null,s.id);render(result.session);notify('Histórico carregado do servidor.');}));
  host.append(item);
 }
}));
$('draw').addEventListener('click',()=>safe(async()=>{
 if(!session||session.draws.length===session.total)return;
 // Em caso de timeout, não repetir automaticamente: atualização consulta estado oficial.
 const requestId=crypto.randomUUID();
 const result=await request('POST',{action:'draw',sessionId:session.id,requestId});
 render(result.session);notify('Número registrado e assinado no servidor.');
}));
$('refresh').addEventListener('click',()=>safe(async()=>{
 if(!session)throw Error('Nenhum sorteio aberto.');
 const result=await request('GET',null,session.id);render(result.session);notify('Estado sincronizado com o servidor.');
}));
$('export').addEventListener('click',()=>{
 if(!session)return;
 const documentData={format:'roleta-secure-draw-v1',exportedAt:new Date().toISOString(),session};
 const blob=new Blob([JSON.stringify(documentData,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='sorteio-oficial-'+session.id+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
})();
