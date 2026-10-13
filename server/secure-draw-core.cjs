'use strict';
// Motor do sorteio oficial: somente Node, sem acesso do navegador ao gerador.
const crypto=require('node:crypto');
const MAX=200;
function bounds(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Dados inválidos.');
 const mode=input.mode==='range'?'range':input.mode==='count'?'count':null;
 if(!mode)throw Error('Tipo de sorteio inválido.');
 const first=mode==='count'?1:input.first;
 const last=mode==='count'?input.total:input.last;
 if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first<1||last<first||last>999999||last-first+1>MAX)throw Error('Informe entre 1 e 200 bolinhas, com limites válidos.');
 return {mode,first,last,total:last-first+1};
}
function canonical(value){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
function sha256(value){return crypto.createHash('sha256').update(value).digest('hex');}
function sign(payload,privateKey){
 const message=Buffer.from(canonical(payload),'utf8');
 const key=crypto.createPrivateKey(privateKey);
 if(key.asymmetricKeyType!=='ed25519')throw Error('Assinatura exige chave Ed25519.');
 return crypto.sign(null,message,key).toString('base64url');
}
function publicKey(privateKey){
 return crypto.createPublicKey(privateKey).export({type:'spki',format:'pem'});
}
function verify(payload,signature,pubKey){
 if(!signature||typeof signature!=='string'||signature.length>200)return false;
 try{return crypto.verify(null,Buffer.from(canonical(payload)),pubKey,Buffer.from(signature,'base64url'));}
 catch{return false;}
}
function pick(first,last,picked,randomInt=crypto.randomInt){
 if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first<1||last<first||last-first+1>MAX)throw Error('Intervalo inválido.');
 const used=new Set(picked);
 if(used.size!==picked.length||picked.some(n=>!Number.isSafeInteger(n)||n<first||n>last))throw Error('Estado inválido.');
 const available=[];for(let n=first;n<=last;n++)if(!used.has(n))available.push(n);
 if(!available.length)throw Error('Sorteio encerrado.');
 return available[randomInt(available.length)];
}
function requestId(value){if(typeof value!=='string'||!/^[-a-f0-9]{36}$/i.test(value)||!isUuid(value))throw Error('Identificador de solicitação inválido.');return value;}
function isUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);}
function authorized(auth,secret){
 if(typeof secret!=='string'||secret.length<32)return false;
 const match=/^Bearer ([^\s]+)$/.exec(auth||'');
 if(!match)return false;
 const a=crypto.createHash('sha256').update(match[1]).digest();
 const b=crypto.createHash('sha256').update(secret).digest();
 return crypto.timingSafeEqual(a,b);
}
function receipt(payload,key){return {payload,signature:sign(payload,key),algorithm:'Ed25519',version:1};}
module.exports={MAX,bounds,canonical,sha256,sign,verify,publicKey,pick,requestId,isUuid,authorized,receipt};
