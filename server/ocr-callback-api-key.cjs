'use strict';
// Managed Make HTTP v4 credential mode: configured in keychain, never in mapped scenario fields.
// Nonce is durably claimed in roleta_intake.complete_signed_callback.
const crypto=require('node:crypto');
const MAX_SKEW_MS=5*60*1000;
function verifyManagedKey(args,{secret,now=Date.now()}={}){
 if(args.method!=='POST'||args.path!=='/api/ocr-callback')throw Error('invalid callback method');
 if(typeof secret!=='string'||Buffer.byteLength(secret,'utf8')<32)throw Error('callback secret unavailable');
 if(typeof args.credential!=='string')throw Error('invalid callback credential');
 const expected=crypto.createHash('sha256').update(secret).digest();
 const supplied=crypto.createHash('sha256').update(args.credential).digest();
 if(!crypto.timingSafeEqual(expected,supplied))throw Error('invalid callback credential');
 if(typeof args.jobId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(args.jobId))throw Error('invalid callback envelope');
 if(typeof args.nonce!=='string'||!/^[a-zA-Z0-9_-]{16,128}$/.test(args.nonce))throw Error('invalid callback nonce');
 if(!/^[0-9]{13}$/.test(String(args.timestamp)))throw Error('invalid callback timestamp');
 const ts=Number(args.timestamp);
 if(!Number.isSafeInteger(ts)||Math.abs(now-ts)>MAX_SKEW_MS)throw Error('callback timestamp rejected');
 return {jobId:args.jobId,nonce:args.nonce,timestamp:ts};
}
module.exports={verifyManagedKey,MAX_SKEW_MS};
