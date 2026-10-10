'use strict';
// Private, non-routed HTTP adapter. Does not export a Vercel handler or write data.
const crypto=require('node:crypto');
const googleAuth=require('../auth/google');
const {prepareAuthenticatedEvidence,MAX_BODY_BYTES}=require('./prospective-evidence-boundary.cjs');
function csrfMatches(provided,expected){
 if(typeof provided!=='string'||typeof expected!=='string')return false;
 const a=Buffer.from(provided,'utf8'),b=Buffer.from(expected,'utf8');
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function prepareEvidenceFromHttp(req,{auth=googleAuth}={}){
 if(!req||req.method!=='POST')throw new Error('method rejected');
 const headers=req.headers||{};
 if(String(headers['content-type']||'').split(';')[0].trim().toLowerCase()!=='application/json')throw new Error('content type rejected');
 const length=Number(headers['content-length']);
 if(headers['content-length']!==undefined&&(!Number.isSafeInteger(length)||length<0||length>MAX_BODY_BYTES))throw new Error('content length rejected');
 if(!auth.requireSameOrigin(req))throw new Error('origin rejected');
 const session=auth.session(req);
 if(!session)throw new Error('authentication required');
 const csrfValid=csrfMatches(headers['x-roleta-csrf'],auth.csrfForSub(session.sub));
 if(!csrfValid)throw new Error('CSRF rejected');
 if(typeof req.body==='string'&&Buffer.byteLength(req.body,'utf8')>MAX_BODY_BYTES)throw new Error('request too large');
 const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
 if(!body||Buffer.isBuffer(body))throw new Error('JSON body required');
 return prepareAuthenticatedEvidence({session,body,csrfValid:true,originValid:true});
}
module.exports={prepareEvidenceFromHttp,csrfMatches};
