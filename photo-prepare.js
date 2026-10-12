(function(root){
'use strict';
const MAX_BYTES=900000;
const MAX_SOURCE_BYTES=25*1024*1024;
const TYPES=new Set(['image/jpeg','image/png','image/webp']);
async function prepare(file,env=root){
 if(!file||!TYPES.has(file.type)||!file.size||file.size>MAX_SOURCE_BYTES)
   throw Error('Selecione JPEG, PNG ou WebP de até 25 MB.');
 const url=env.URL.createObjectURL(file);
 const image=new env.Image();
 let canvas;
 try{
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não foi possível abrir esta fotografia.'));image.src=url;});
   const width=image.naturalWidth,height=image.naturalHeight;
   if(!width||!height||width*height>60000000)throw Error('Fotografia com dimensões não suportadas.');
   const longest=Math.max(width,height);
   if(file.type==='image/jpeg'&&file.size<=MAX_BYTES&&longest<=3000)
     return {file,width,height,originalBytes:file.size};
   canvas=env.document.createElement('canvas');
   const context=canvas.getContext('2d');
   if(!context)throw Error('Este navegador não conseguiu preparar a fotografia.');
   // Keep handwriting detail: moderate JPEG compression, then gradual resizing.
   // Never upscale, and never shrink a large source below 1800 px on its long edge.
   const minimum=Math.min(longest,1800);
   let edge=Math.min(longest,3000);
   while(true){
     canvas.width=Math.max(1,Math.round(width*edge/longest));
     canvas.height=Math.max(1,Math.round(height*edge/longest));
     context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
     context.drawImage(image,0,0,canvas.width,canvas.height);
     for(const quality of [.90,.84,.78]){
       const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
       if(!blob||blob.type!=='image/jpeg')throw Error('Este navegador não conseguiu gerar a cópia JPEG.');
       if(blob.size>0&&blob.size<=MAX_BYTES){
         const name=(file.name||'fotografia').replace(/\.[^.]+$/,'')+'-ocr.jpg';
         return {file:new env.File([blob],name,{type:'image/jpeg'}),width:canvas.width,height:canvas.height,originalBytes:file.size};
       }
     }
     if(edge===minimum)break;
     edge=Math.max(minimum,Math.floor(edge*.85));
   }
   throw Error('Não foi possível reduzir a foto a 900 KB preservando os detalhes. Fotografe mais perto da folha, com menos fundo e boa iluminação.');
 }finally{
   env.URL.revokeObjectURL(url);
   image.onload=null;image.onerror=null;image.src='';
   if(canvas){canvas.width=0;canvas.height=0;}
 }
}
const api=Object.freeze({prepare,MAX_BYTES,MAX_SOURCE_BYTES});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.RoletaPhotoPrepare=api;
})(typeof window!=='undefined'?window:globalThis);
