'use strict';
const assert=require('node:assert/strict');
const {File}=require('node:buffer');
const {prepare,MAX_BYTES}=require('../photo-prepare');
function environment(width,height,sizeFor,{decodeError=false}={}){
 const calls=[],revoked=[];
 const canvas={width:0,height:0,getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback,type,quality){
   calls.push({width:this.width,height:this.height,quality});
   callback(new Blob([new Uint8Array(sizeFor(this.width,this.height,quality))],{type}));
 }};
 class Image{
   naturalWidth=width;naturalHeight=height;
   set src(value){if(value)queueMicrotask(()=>decodeError?this.onerror():this.onload());}
 }
 return {Image,File,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:url=>revoked.push(url)},document:{createElement:()=>canvas},calls,revoked,canvas};
}
const source=(type='image/jpeg',size=5000000)=>new File([new Uint8Array(size)],'folha.png',{type});
(async()=>{
 const small=source('image/jpeg',MAX_BYTES);
 let env=environment(1000,1400,()=>0),result=await prepare(small,env);
 assert.equal(result.file,small);assert.equal(env.calls.length,0);assert.equal(env.revoked.length,1);
 env=environment(4000,6000,(_w,_h,q)=>q>.8?950000:850000);
 result=await prepare(source(),env);
 assert.equal(result.file.type,'image/jpeg');assert.equal(result.file.name,'folha-ocr.jpg');
 assert.ok(result.file.size<=MAX_BYTES);assert.equal(result.width,2000);assert.equal(result.height,3000);
 assert.equal(env.calls.length,3);assert.equal(env.canvas.width,0);assert.equal(env.revoked.length,1);
 env=environment(6000,4000,w=>w>2500?1000000:800000);
 result=await prepare(source('image/png'),env);
 assert.ok(result.width>=1800&&result.width<=2500);assert.ok(Math.abs(result.width/result.height-1.5)<.002);
 env=environment(800,1200,()=>500000);
 result=await prepare(source('image/webp'),env);assert.equal(result.width,800);assert.equal(result.height,1200);
 env=environment(6000,4000,()=>1000000);
 await assert.rejects(prepare(source(),env),/900 KB/);
 assert.equal(Math.min(...env.calls.map(c=>c.width)),1800);assert.ok(env.calls.every(c=>c.quality>=.78));
 assert.equal(env.revoked.length,1);assert.equal(env.canvas.width,0);
 env=environment(1000,1400,()=>0,{decodeError:true});
 await assert.rejects(prepare(source(),env),/abrir/);assert.equal(env.revoked.length,1);
 await assert.rejects(prepare(source('application/pdf'),env),/JPEG/);
 await assert.rejects(prepare(source('image/jpeg',26*1024*1024),env),/25 MB/);
 console.log('PASS: photo budget, adaptive JPEG, aspect ratio, no upscaling, detail floor and resource cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
