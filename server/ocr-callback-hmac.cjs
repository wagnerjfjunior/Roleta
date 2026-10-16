'use strict';
// SFJM draft: server-side HMAC verification primitive. No route or production wiring.
// Caller MUST atomically reserve (jobId, nonce) in durable storage before persisting.
const crypto=require('node:crypto');
const MAX_SKEW_MS=5*60*1000;
function canonical({method,path,timestamp,nonce,jobId,body}){
 if(method!=='POST'||typeof path!=='string'||!/^\/[a-z0-9/_-]{1,180}$/.test(path)||
   !/^[0-9]{13}$/.test(String(timestamp))||typeof nonce!=='string'||
   !/^[a-zA-Z0-9_-]{16,128}$/.test(nonce)||
   typeof jobId!=='string'||!/^[a-f0-9-]{36}$/i.test(jobId)||
   !Buffer.isBuffer(body)||body.length>1024*1024)throw Error('invalid callback envelope');
 return Buffer.concat([Buffer.from('roleta-callback-v1\n'+method+'\n'+path+'\n'+timestamp+'\n'+nonce+'\n'+jobId+'\n'+body.length+'\n'),body]);
}
function verifyCallback(args,{secret,now=Date.now()}={}){
 if(typeof secret!=='string'||Buffer.byteLength(secret)<32)throw Error('callback secret unavailable');
 const ts=Number(args.timestamp);
 if(!Number.isSafeInteger(ts)||Math.abs(now-ts)>MAX_SKEW_MS)throw Error('callback timestamp rejected');
 if(typeof args.signature!=='string'||!/^v1=[a-f0-9]{64}$/.test(args.signature))throw Error('invalid signature');
 const expected=crypto.createHmac('sha256',secret).update(canonical(args)).digest();
 const supplied=Buffer.from(args.signature.slice(3),'hex');
 if(!crypto.timingSafeEqual(expected,supplied))throw Error('callback signature rejected');
 return {jobId:args.jobId,nonce:args.nonce,timestamp:ts};
}
module.exports={canonical,verifyCallback,MAX_SKEW_MS};
