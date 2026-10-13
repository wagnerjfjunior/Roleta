(function(){
'use strict';
const host=document.getElementById('simpleIntake');
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
if(intro)intro.textContent='Escolha uma fotografia nítida da folha. A leitura acontece automaticamente após o envio.';
const source=photo.querySelector('h3');
if(source)source.textContent='Como deseja enviar?';
const camera=photo.querySelector('[data-photo-camera]');
const gallery=photo.querySelector('[data-photo-gallery]');
if(camera)camera.textContent='Tirar foto';
if(gallery)gallery.textContent='Escolher da galeria';
const login=photo.querySelector('[data-google-login]');
if(login)login.textContent='Conectar com Google';
const send=photo.querySelector('[data-photo-send]');
if(send)send.textContent='Ler fotografia';
const transfer=()=>photo.querySelector('[data-review-transfer]');
const stepNodes=[...document.querySelectorAll('[data-step]')];
const finalTitle=preview.querySelector('h2');
if(finalTitle)finalTitle.textContent='Roleta conferida';
const print=host.querySelector('#rltv2Print');
if(print)print.textContent='Imprimir';
const pdf=host.querySelector('#rltv2SavePdf');
if(pdf)pdf.textContent='Salvar PDF';
const share=host.querySelector('#rltv2SharePdf');
if(share)share.textContent='Compartilhar JPEG';
const apply=host.querySelector('#rltv2ApplyReview');
if(apply)apply.textContent='Validar folha final';
let phase=0;
function update(){
 const isFinal=!preview.hidden;
 const isCanonical=!review.hidden;
 const isHuman=!!transfer();
 const next=isFinal?4:isCanonical?3:isHuman?2:1;
 if(next!==phase){
   phase=next;
   host.dataset.simplePhase=String(phase);
   stepNodes.forEach(el=>{
     const n=Number(el.dataset.step);
     el.classList.toggle('active',n===(phase>=3?3:phase));
     el.classList.toggle('complete',n<(phase>=3?3:phase));
   });
   if(next===1)notice.textContent='Tire uma foto ou escolha uma imagem para iniciar.';
   else if(next===2)notice.textContent='Confira os nomes e as bolinhas na fotografia. Marque cada linha revisada.';
   else if(next===3)notice.textContent='Confira SALÃO, STAND-BY, ON-LINE e o sorteio de empresa.';
   else notice.textContent='Confirme a folha final para liberar impressão, JPEG e compartilhamento.';
 }
 const button=transfer();
 if(button)button.textContent='Continuar para a folha final';
 if(isHuman){
   const section=human.querySelector('.rltv2-review-card');
   if(section)section.classList.add('simple-human-review');
 }
 const status=photo.querySelector('[data-photo-status]');
 if(status&&status.textContent.includes('ENVIO NÃO CONCLUÍDO'))notice.textContent='A leitura falhou. Veja o motivo abaixo e tente novamente.';
}
const obs=new MutationObserver(update);
obs.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','class']});
update();
})();