(function(){
'use strict';
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function mount(host){
 if(!host||!window.RoletaGeminiConverter)return;
 const article=document.createElement('article');
 article.className='card rltv2-import-card';
 article.innerHTML='<div class="section-head"><div><span class="eyebrow">0 · LEITURA AUTOMÁTICA</span><h2>Conferir extração Gemini</h2></div><span class="intake-risk">NÃO VALIDADO</span></div>'+
 '<p class="small muted">Importe a resposta JSON preliminar do Make/Gemini. Esta etapa é apenas diagnóstico: não autoriza impressão, não importa dados para o SALÃO e não grava na base.</p>'+
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
 article.querySelector('[data-gemini-check]').addEventListener('click',async()=>{
  status.className='intake-gate blocked';status.textContent='Validando leitura e cadastro…';details.replaceChildren();
  try{
   const response=await fetch('/data/print-brokers.json',{cache:'no-store'});
   if(!response.ok)throw Error('Cadastro oficial indisponível.');
   const dto=await response.json();
   const original=JSON.parse(textarea.value);
   const value=original?.result?.linhas?original.result:original?.body?.linhas?original.body:original;
   const draft=window.RoletaGeminiConverter.convertGeminiDraft(value,dto);
   const lines=draft.leitura_original.linhas;
   status.className='intake-gate blocked';
   status.innerHTML='<strong>RASCUNHO NÃO APROVADO</strong><div>'+lines.length+' linhas lidas; '+draft.pendencias.length+' pendências. Compare cada registro com a fotografia antes de prosseguir.</div>';
   const problems=document.createElement('div');
   problems.innerHTML='<h3>Pendências</h3>'+draft.pendencias.map(p=>'<div>• '+escapeHtml(p.code)+': '+escapeHtml(p.message)+(p.posicao===undefined?'':' (linha '+escapeHtml(p.posicao)+')')+'</div>').join('');
   details.appendChild(problems);
   const wrap=document.createElement('div');wrap.className='rltv2-review-wrap';
   wrap.innerHTML='<table class="rltv2-review-table"><thead><tr><th>Posição</th><th>Nome lido</th><th>Nome oficial</th><th>CRECI</th><th>Número lido</th><th>Cadastro</th></tr></thead><tbody>'+
   lines.map(l=>'<tr><td>'+escapeHtml(l.posicao_impressa)+'</td><td>'+escapeHtml(l.nome_lido)+'</td><td>'+escapeHtml(l.nome||'PENDENTE')+'</td><td>'+escapeHtml(l.creci)+'</td><td>'+escapeHtml(l.numero_sorteado??'—')+'</td><td>'+ (l.cadastro_confirmado?'Correspondência única':'Verificar')+'</td></tr>').join('')+'</tbody></table>';
   details.appendChild(wrap);
  }catch(e){
   status.className='intake-gate blocked';
   status.innerHTML='<strong>LEITURA BLOQUEADA</strong><div>'+escapeHtml(e.message||e)+'</div>';
  }
 });
}
window.RoletaGeminiDraftUI={mount};
})();