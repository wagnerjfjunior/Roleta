'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/ocr-reconcile.js');
const secret = 'shadow-test-token-with-32-bytes-minimum-length';
function response() {
 return {
   statusCode:200, headers:{}, body:null,
   setHeader(k,v){this.headers[k]=v;return this;},
   status(code){this.statusCode=code;return this;},
   json(value){this.body=value;return this;}
 };
}
async function send(body, opts={}) {
 const req={
   method:opts.method || 'POST',
   headers:{
     authorization: opts.authorization ?? 'Bearer '+secret,
     'content-type':opts.contentType ?? 'application/json',
     'content-length':String(Buffer.byteLength(JSON.stringify(body??{})))
   },
   body
 };
 const res=response();
 await handler(req,res);
 return res;
}
test('fail-closed without configured credential', async()=>{
 const old=process.env.ROLETA_OCR_SHADOW_TOKEN;
 delete process.env.ROLETA_OCR_SHADOW_TOKEN;
 try{assert.equal((await send({})).statusCode,401);}
 finally{if(old===undefined)delete process.env.ROLETA_OCR_SHADOW_TOKEN;else process.env.ROLETA_OCR_SHADOW_TOKEN=old;}
});
test('requires authenticated POST JSON and valid identifier',async()=>{
 process.env.ROLETA_OCR_SHADOW_TOKEN=secret;
 const valid={event_id:'20261006-M-001',parsedText:'***Corretor***\n1 Globz\nDATA - 06/10/2026'};
 assert.equal((await send(valid,{authorization:'Bearer wrong'})).statusCode,401);
 assert.equal((await send(valid,{method:'GET'})).statusCode,405);
 assert.equal((await send(valid,{contentType:'text/plain'})).statusCode,415);
 assert.equal((await send({...valid,event_id:'../../insecure'})).statusCode,422);
 assert.equal((await send({...valid,parsedText:'unstructured'})).statusCode,422);
});
test('returns read-only diagnostic without any draw numbers',async()=>{
 process.env.ROLETA_OCR_SHADOW_TOKEN=secret;
 const response=await send({event_id:'20261006-M-001',parsedText:'***Corretor***\n1 Gloszy\n2 Prina\nDATA - 06/10/2026'});
 assert.equal(response.statusCode,200);
 assert.equal(response.body.mode,'SHADOW');
 assert.equal(response.body.autorizado_impressao,false);
 assert.equal(response.body.autorizado_base_estatistica,false);
 assert.equal(response.body.linhas[0].confirmado,null);
 assert.equal(response.body.linhas[0].nome_ocr,'Gloszy');
 assert.equal(response.body.linhas[1].confirmado.nome,'Prina');
 assert.equal(JSON.stringify(response.body).includes('numero_sorteado'),false);
 assert.equal(response.headers['Cache-Control'],'no-store');
});
