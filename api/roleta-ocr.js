'use strict';
const auth=require('../auth/google');
const MAX_BYTES=4*1024*1024;
const ALLOWED=new Set(['image/jpeg','image/png','image/webp']);
async function readStream(req){
 if(Buffer.isBuffer(req.body)){if(req.body.length>MAX_BYTES){const e=new Error('Imagem excede 4 MB.');e.status=413;throw e;}return req.body;}
 const chunks=[];let total=0;
 for await(const part of req){
   const chunk=Buffer.isBuffer(part)?part:Buffer.from(part);
   total+=chunk.length;
   if(total>MAX_BYTES){const err=new Error('Imagem excede 4 MB.');err.status=413;throw err;}
   chunks.push(chunk);
 }
 return Buffer.concat(chunks);
}
function validResponse(value){
 return !!(value&&typeof value==='object'&&!Array.isArray(value)&&Array.isArray(value.linhas)&&value.linhas.length>0&&value.linhas.length<=100&&value.linhas.every(l=>l&&typeof l==='object'&&!Array.isArray(l)&&(l.posicao_impressa===null||(Number.isInteger(Number(l.posicao_impressa))&&Number(l.posicao_impressa)>=1&&Number(l.posicao_impressa)<=100))&&(l.nome_lido===null||typeof l.nome_lido==='string')&&(l.numero_sorteado===null||typeof l.numero_sorteado==='string'||typeof l.numero_sorteado==='number')));
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Método não permitido.'});}
 if(!auth.requireSameOrigin(req))return res.status(403).json({error:'Origem não autorizada.'});
 let currentSession=null;
 try{currentSession=auth.session(req);}catch{}
 if(!currentSession)return res.status(401).json({error:'Entre com uma conta Google autorizada para enviar fotografias.'});
 const csrf=req.headers['x-roleta-csrf'];
 const expectedCsrf=auth.csrfForSub(currentSession.sub);
 // Constant-time check without trusting request-provided token lengths.
 const crypto=require('node:crypto');
 const received=typeof csrf==='string'?Buffer.from(csrf):Buffer.alloc(0);
 const expected=Buffer.from(expectedCsrf);
 if(received.length!==expected.length||!crypto.timingSafeEqual(received,expected))return res.status(403).json({error:'Confirmação de segurança inválida. Recarregue a página.'});
 const webhook=process.env.ROLETA_MAKE_WEBHOOK_URL;
 if(!webhook)return res.status(503).json({error:'Integração Make indisponível.'});
 const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
 if(!ALLOWED.has(mime))return res.status(415).json({error:'Formato de imagem não permitido.'});
 const length=Number(req.headers['content-length']||0);
 if(length>MAX_BYTES)return res.status(413).json({error:'Imagem excede 4 MB.'});
 const originalName=String(req.headers['x-roleta-filename']||'captura').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,70)||'captura';
 const suffix=mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg';
 // Filename is not used as an authorization or routing mechanism.
 const fileName=originalName.replace(/\.(jpe?g|png|webp)$/i,'')+suffix;
 let url;
 try{url=new URL(webhook);if(url.protocol!=='https:'||!url.hostname.endsWith('.make.com'))throw Error('host');}
 catch{return res.status(503).json({error:'Destino Make inválido.'});}
 let bytes;
 try{bytes=await readStream(req);}catch(e){return res.status(e.status||400).json({error:e.message});}
 if(bytes.length===0)return res.status(400).json({error:'Fotografia vazia.'});
 // Minimal file signature checks; content is untrusted and not executed.
 const isJpeg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 const isPng=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const isWebp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!((mime==='image/jpeg'&&isJpeg)||(mime==='image/png'&&isPng)||(mime==='image/webp'&&isWebp))){
   return res.status(415).json({error:'Conteúdo da imagem não corresponde ao formato declarado.'});
 }
 const form=new FormData();
 form.append('file',new Blob([bytes],{type:mime}),fileName);
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),55000);
 let upstream;
 try{upstream=await fetch(url.toString(),{method:'POST',body:form,signal:controller.signal,redirect:'error'});}
 catch(e){clearTimeout(timeout);return res.status(502).json({error:e.name==='AbortError'?'O processamento demorou demais. Tente novamente.':'Falha na comunicação com o Make.'});}
 clearTimeout(timeout);
 if(!upstream.ok)return res.status(502).json({error:'Make retornou erro HTTP '+upstream.status+'.'});
 let result;
 try{
  const raw=await upstream.text();
  if(raw.length>1000000)throw Error('resposta grande');
  result=JSON.parse(raw);
 }catch{return res.status(502).json({error:'Make não retornou JSON válido. Verifique o módulo Webhook Response.'});}
 const data=validResponse(result)?result:validResponse(result?.body)?result.body:validResponse(result?.result)?result.result:null;
 if(!data)return res.status(502).json({error:'Resposta do Make não contém linhas do Gemini.'});
 return res.status(200).json({status:'PENDENTE_REVISAO',source:'make-gemini',result:data});
};