'use strict';
const {timingSafeEqual}=require('node:crypto');
const MAX_BYTES=4*1024*1024;
const ALLOWED=new Set(['image/jpeg','image/png','image/webp']);
function equalSecret(input,expected){
 if(typeof input!=='string'||typeof expected!=='string'||!expected)return false;
 const a=Buffer.from(input),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
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
 return value&&typeof value==='object'&&!Array.isArray(value)&&Array.isArray(value.linhas);
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Método não permitido.'});}
 const origin=req.headers.origin||'';
 const host=req.headers['x-forwarded-host']||req.headers.host||'';
 if(!origin||!host){return res.status(403).json({error:'Origem não autorizada.'});}
 let parsedOrigin;
 try{parsedOrigin=new URL(origin);}catch{return res.status(403).json({error:'Origem inválida.'});}
 if(parsedOrigin.host!==host||parsedOrigin.protocol!=='https:'&&parsedOrigin.hostname!=='localhost'){
   return res.status(403).json({error:'Origem não autorizada.'});
 }
 const expected=process.env.ROLETA_UPLOAD_ACCESS_TOKEN;
 const webhook=process.env.ROLETA_MAKE_WEBHOOK_URL;
 if(!expected||expected.length<24||!webhook)return res.status(503).json({error:'Integração não configurada no servidor.'});
 const supplied=req.headers['x-roleta-access-token'];
 if(!equalSecret(supplied,expected))return res.status(401).json({error:'Código de acesso inválido.'});
 const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
 if(!ALLOWED.has(mime))return res.status(415).json({error:'Formato de imagem não permitido.'});
 const length=Number(req.headers['content-length']||0);
 if(length>MAX_BYTES)return res.status(413).json({error:'Imagem excede 4 MB.'});
 const fileName=String(req.headers['x-roleta-filename']||'roleta.jpeg').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100)||'roleta.jpeg';
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