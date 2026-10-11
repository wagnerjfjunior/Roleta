'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHandler,diagnosticCode}=require('../../api/prospective-v2-health.js');
function response(){const state={code:0,data:null};return {state,setHeader(){},status(code){state.code=code;return this;},json(data){state.data=data;return this;}};}
const auth={requireSameOrigin:()=>true,session:()=>({sub:'ci-operator'}),csrfForSub:()=> 'ci-csrf'};
const req={method:'POST',headers:{'x-roleta-csrf':'ci-csrf'}};
test('read-only preflight refuses no-login and forged CSRF before DB access',async()=>{
 let touched=0;const transport={databaseUrl:()=>{touched++;},getPool:()=>{touched++;}};
 for(const [a,q,expected] of [[{...auth,session:()=>null},req,401],[auth,{...req,headers:{'x-roleta-csrf':'wrong'}},403],[{...auth,requireSameOrigin:()=>false},req,403]]){
  const res=response();await createHandler({authenticate:a,transport})(q,res);
  assert.equal(res.state.code,expected);assert.equal(touched,0);
 }
});
test('read-only preflight approves only restricted role and permission matrix',async()=>{
 let query='';
 const transport={databaseUrl:()=>{},getPool:()=>({query:async(q)=>{query=q;return {rows:[{identity_ok:true,execute_ok:true,direct_insert_denied:true,direct_select_denied:true}]};}})};
 const res=response();await createHandler({authenticate:auth,transport})(req,res);
 assert.equal(res.state.code,200);
 assert.deepEqual(res.state.data,{status:'CONNECTED_RESTRICTED'});
 assert.match(query,/SELECT current_user/);
 assert.doesNotMatch(query,/\bINSERT INTO\b|\bUPDATE\b|\bDELETE FROM\b/i);
});
test('never disclose credentials, database errors or incorrect privileges',async()=>{
 for(const transport of [
  {databaseUrl:()=>{throw Error('secret-password-in-url');}},
  {databaseUrl:()=>{},getPool:()=>({query:async()=>({rows:[{identity_ok:false,execute_ok:true,direct_insert_denied:false,direct_select_denied:false}]})})}
 ]){
  const res=response();await createHandler({authenticate:auth,transport})(req,res);
  assert.equal(res.state.code,503);
  assert.doesNotMatch(JSON.stringify(res.state.data),/secret|password|roleta_v2_writer/i);
 }
});

test('coarse diagnostic categories cannot reveal raw provider errors',()=>{
 const cases=[
  [{code:'28P01',message:'password authentication failed for user private'},'DATABASE_AUTH_REJECTED'],
  [{code:'ENOTFOUND',message:'getaddrinfo ENOTFOUND private host'},'DATABASE_NETWORK_UNREACHABLE'],
  [{code:'ETIMEDOUT',message:'connection timeout'},'DATABASE_TIMEOUT'],
  [{code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE',message:'certificate invalid'},'DATABASE_TLS_REJECTED'],
  [{message:'F2-12 database credential not configured'},'DATABASE_CONFIGURATION_INVALID'],
  [{message:'opaque password secret'},'DATABASE_CONNECTION_UNAVAILABLE']
 ];
 for(const [error,want] of cases){
  const got=diagnosticCode(error);
  assert.equal(got,want);
  assert.doesNotMatch(got,/private|password|secret|host/i);
 }
});

test('diagnostics distinguish invalid public CA and SQL failures without exposing provider text',()=>{
 for(const [error,expected] of [
  [{message:'F2-12 trusted pooler CA PEM missing or invalid'},'DATABASE_CA_CONFIGURATION_INVALID'],
  [{code:'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',message:'internal certificate details'},'DATABASE_TLS_REJECTED'],
  [{code:'42501',message:'permission denied for private'},'DATABASE_SQL_PRIVILEGE_OR_SCHEMA_ERROR'],
  [{code:'42P01',message:'relation missing'},'DATABASE_SQL_PRIVILEGE_OR_SCHEMA_ERROR']
 ]){
  assert.equal(diagnosticCode(error),expected);
  assert.doesNotMatch(diagnosticCode(error),/private|certificate details|permission denied/i);
 }
});
