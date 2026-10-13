(function(){
'use strict';
const host=document.getElementById('simpleIntake');
const notice=document.getElementById('simpleNotice');
if(!host||!window.RouletteIntake){if(notice)notice.textContent='Não foi possível abrir a roleta. Atualize a página.';return;}
window.RouletteIntake.mount(host);
const card=host.querySelector('[data-photo-camera]')?.closest('article');
if(!card){notice.textContent='O módulo de foto não carregou. Atualize a página.';return;}
const heading=card.querySelector('h2');if(heading)heading.textContent='1. Fotografe a roleta';
const introduction=card.querySelector('p.small.muted');if(introduction)introduction.textContent='Tire uma foto nítida da folha ou escolha uma imagem da galeria.';
const auth=card.querySelector('[data-google-auth]');
const review=host.querySelector('#rltv2ReviewCard');
const preview=host.querySelector('#rltv2PreviewCard');
const reviewDetails=card.querySelector('[data-gemini-detail]');
const phase=n=>{
 document.querySelectorAll('[data-step]').forEach(el=>el.classList.toggle('active',Number(el.dataset.step)===n));
};
let last=1;
function refresh(){
 const finalVisible=preview&&!preview.hidden;
 const canonicalVisible=review&&!review.hidden;
 const humanVisible=!!reviewDetails?.querySelector('[data-review-transfer]');
 const current=finalVisible?3:(canonicalVisible||humanVisible?2:1);
 phase(current);
 if(current!==last){
  notice.textContent=current===2?'Compare cada corretor e número com a fotografia, confira Stand-by e On-line e valide.':current===3?'Confira a folha final. Depois imprima, salve JPEG ou compartilhe.';
  last=current;
 }
}
const observer=new MutationObserver(refresh);
observer.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled']});
refresh();
if(auth)auth.setAttribute('aria-live','polite');
const previewHeading=preview?.querySelector('h2');if(previewHeading)previewHeading.textContent='3. Conferir e compartilhar';
const pdfButton=host.querySelector('#rltv2SavePdf');
if(pdfButton)pdfButton.textContent='Salvar PDF';
const printButton=host.querySelector('#rltv2Print');
if(printButton)printButton.textContent='Imprimir';
const shareButton=host.querySelector('#rltv2SharePdf');
if(shareButton)shareButton.textContent='Compartilhar JPEG';
})();