'use strict';
// F2-12 deployable boundary contract, intentionally WITHOUT DB transport.
// This function never executes SQL. A backend route may call it only after
// validating origin, CSRF, Google session, and persisted actor->person ACL.
const {prepareAuthenticatedEvidence,MAX_BODY_BYTES,validateStructureBudget}=
 require('./prospective-evidence-boundary.cjs');
const {buildPersonAppendCommand}=require('./prospective-person-db-command-v2.cjs');
const MAX_SUBJECT_LEN=128;
function prepareVerifiedV2Append({session,body,csrfValid,originValid,authorizedPersonIds}={}){
 if(csrfValid!==true||originValid!==true)throw new Error('V2 origin/CSRF rejected');
 if(!session||session.verified!==true||session.provider!=='google'
    ||typeof session.sub!=='string'||session.sub.length<1
    ||session.sub.length>MAX_SUBJECT_LEN)throw new Error('verified Google session required');
 if(!(authorizedPersonIds instanceof Set)||!authorizedPersonIds.size
    ||authorizedPersonIds.size>10000)throw new Error('persisted person ACL required');
 if(!body||typeof body!=='object'||Array.isArray(body))
  throw new Error('request body required');
 validateStructureBudget(body);
 // Reuse the existing transport boundary for origin, CSRF and input budgets.
 // The resulting V1 hash is NOT passed to V2; V2 hashes its own full envelope.
 prepareAuthenticatedEvidence({session,body,csrfValid,originValid});
 const command=buildPersonAppendCommand({session,authorizedPersonIds,body});
 if(Buffer.byteLength(command.params[0],'utf8')>MAX_BODY_BYTES+2048)
  throw new Error('V2 envelope exceeds transport budget');
 return command;
}
module.exports={prepareVerifiedV2Append};
