'use strict';
// F2-12 existing Vercel Google OAuth bridge. SERVER ONLY; NOT a route,
// DB client or activation flag. Fails closed if persisted ACL is unavailable.
const googleAuth=require('../auth/google');
const {prepareEvidenceFromHttp}=require('./prospective-evidence-http.cjs');
const {prepareVerifiedV2Append}=require('./prospective-v2-verified-boundary.cjs');
async function prepareV2FromHttp(req,{auth=googleAuth,loadAuthorizedPersonIds}={}){
 if(typeof loadAuthorizedPersonIds!=='function')
  throw new Error('server persisted ACL loader required');
 // Existing V1 HTTP boundary enforces POST + JSON, signed cookie via auth.session,
 // configured same-site Origin and constant-time CSRF header comparison.
 const checked=prepareEvidenceFromHttp(req,{auth});
 // Session comes only from the trusted server auth module, never the request.
 const session=auth.session(req);
 if(!session||session.sub!==checked.actor_subject.slice('google:'.length))
  throw new Error('verified session mismatch');
 const personIds=await loadAuthorizedPersonIds({googleSub:session.sub,email:session.email});
 if(!(personIds instanceof Set))throw new Error('server persisted ACL must return Set');
 return prepareVerifiedV2Append({
  session:{...session,verified:true,provider:'google'},
  body:checked.body,authorizedPersonIds:personIds,csrfValid:true,originValid:true
 });
}
module.exports={prepareV2FromHttp};
