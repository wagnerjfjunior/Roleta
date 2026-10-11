'use strict';
// Server-only operator-controlled ACL. Set ROLETA_V2_PERSON_ACL_JSON in
// Vercel server environment, NOT in the front-end and NOT NEXT_PUBLIC_.
// JSON object: {"google-sub-123":["broker-person-id-a","broker-person-id-b"]}
// Missing/invalid config returns no authorization (fail closed).
const ID=/^[A-Za-z0-9_-]{1,128}$/;
function loadAuthorizedPersonIdsFromEnv({googleSub}={}){
 if(typeof googleSub!=='string'||!ID.test(googleSub))throw Error('invalid verified Google subject');
 const raw=process.env.ROLETA_V2_PERSON_ACL_JSON;
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw,'utf8')>16384)
  throw Error('private V2 ACL configuration unavailable');
 let acl;
 try{acl=JSON.parse(raw);}catch{throw Error('private V2 ACL JSON invalid');}
 if(!acl||Array.isArray(acl)||typeof acl!=='object'
 ||Object.keys(acl).some(k=>!ID.test(k))
 ||Object.getOwnPropertyNames(acl).some(k=>['__proto__','constructor','prototype'].includes(k)))
  throw Error('private V2 ACL object invalid');
 const ids=Object.hasOwn(acl,googleSub)?acl[googleSub]:null;
 if(!Array.isArray(ids)||ids.length<1||ids.length>1000
    ||ids.some(id=>typeof id!=='string'||!ID.test(id)))
  throw Error('verified Google subject has no valid V2 person ACL');
 return new Set(ids);
}
module.exports={loadAuthorizedPersonIdsFromEnv};
