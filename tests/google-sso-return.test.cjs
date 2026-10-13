'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const auth=require('../auth/google');
const start=require('../api/auth/google/start');
const callback=require('../api/auth/google/callback');
const keys=['ROLETA_SESSION_SECRET','ROLETA_GOOGLE_ALLOWED_EMAILS','ROLETA_SITE_ORIGIN','ROLETA_GOOGLE_CLIENT_ID','ROLETA_GOOGLE_CLIENT_SECRET'];
const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
Object.assign(process.env,{ROLETA_SESSION_SECRET:'test-only-return-secret-over-32-characters',ROLETA_GOOGLE_ALLOWED_EMAILS:'operator@example.test',ROLETA_SITE_ORIGIN:'https://roleta.example.test',ROLETA_GOOGLE_CLIENT_ID:'test-client',ROLETA_GOOGLE_CLIENT_SECRET:'test-secret'});
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},send(v){this.body=v;return this;},end(){return this;},redirect(n,v){this.code=n;this.destination=v;return this;}};}
function flowCookie(res){return res.headers['Set-Cookie'].split(';')[0];}
test('OAuth binds only the approved local return route to signed flow',async()=>{
 for(const candidate of ['/simples/','https://evil.example','//evil.example','/simples/?next=evil','/sorteador/',['/simples/']]){
  const res=response();await start({method:'GET',query:{returnTo:candidate}},res);
  const flow=auth.flow({headers:{cookie:flowCookie(res)}});
  assert.equal(flow.returnTo,candidate==='/simples/'?'/simples/':'/#nova-roleta');
  assert.ok(flow.verifier);assert.ok(flow.state);
  assert.equal(new URL(res.destination).searchParams.get('redirect_uri'),'https://roleta.example.test/api/auth/google/callback');
 }
});
test('callback returns to approved route; tampered cookies cannot redirect',async()=>{
 const oldFetch=global.fetch;
 global.fetch=async url=>({ok:true,json:async()=>String(url).includes('/token')?{access_token:'test-only'}:{email:'operator@example.test',sub:'test-sub',email_verified:true}});
 try{
  for(const route of ['/simples/','//evil.example',undefined]){
   const payload={typ:'oauth',state:'test-state',verifier:'test-verifier',returnTo:route,exp:Date.now()+60000};
   const token=auth.seal(payload);const res=response();
   await callback({method:'GET',query:{state:'test-state',code:'test-code'},headers:{cookie:auth.FLOW+'='+token}},res);
   assert.equal(res.destination,'https://roleta.example.test'+(route==='/simples/'?'/simples/':'/#nova-roleta'));
   assert.match(res.headers['Set-Cookie'][1],/HttpOnly; Secure; SameSite=Lax/);
   const bad=response();await callback({method:'GET',query:{state:'test-state',code:'test-code'},headers:{cookie:auth.FLOW+'='+token+'tampered'}},bad);
   assert.equal(bad.code,403);assert.equal(bad.destination,undefined);
  }
 }finally{global.fetch=oldFetch;}
});
test.after(()=>{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}});
