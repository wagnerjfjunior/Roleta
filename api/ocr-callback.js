'use strict';
// Server-to-server Make callback. Disabled unless dedicated credentials and flag exist.
const {verifyCallback}=require('../server/ocr-callback-hmac.cjs');
const {verifyManagedKey}=require('../server/ocr-callback-api-key.cjs');
const {getIntakePool}=require('../server/ocr-intake-db.cjs');
const MAX=1024*1024;
async function readRaw(req){
 if(Buffer.isBuffer(req.body))return req.body;
 if(typeof req.body==='string')return Buffer.from(req.body,'utf8');
 if(req.body!==undefined)throw Object.assign(Error('raw body required'),{status:415});
 let n=0;const chunks=[];
 for await(const part of req){n+=part.length;if(n>MAX)throw Object.assign(Error('too large'),{status:413});chunks.push(part);}
 return Buffer.concat(chunks);
}
function createHandler({env=process.env,db=getIntakePool,verify=verifyCallback}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  // Authentication-only laboratory probe: never opens the persistence path.
  const probe=req.headers['x-roleta-probe']==='auth';
  if(probe ? env.ROLETA_INTAKE_CALLBACK_PROBE_ENABLED!=='true' : env.ROLETA_INTAKE_ENABLED!=='true')
   return res.status(503).json({error:'Disabled'});
  try{
   // Vercel must not pre-parse JSON: HMAC is over the exact request bytes.
   const body=await readRaw(req);
   if(body.length===0||body.length>MAX)return res.status(413).json({error:'Invalid payload size'});
   if(String(req.headers['content-type']||'').split(';')[0]!=='application/json')return res.status(415).json({error:'JSON required'});
   const jobId=req.headers['x-roleta-job-id'];
   const nonce=req.headers['x-roleta-nonce'];
   const timestamp=req.headers['x-roleta-timestamp'];
   const signature=req.headers['x-roleta-signature'];
   // Exactly one active callback authentication mode. No opportunistic fallback.
   const managed=env.ROLETA_INTAKE_CALLBACK_AUTH==='managed_api_key';
   const validated=managed
    ?verifyManagedKey({method:req.method,path:'/api/ocr-callback',timestamp,nonce,jobId,
       credential:req.headers['x-roleta-callback-key']},{secret:env.ROLETA_INTAKE_CALLBACK_API_KEY})
    :env.ROLETA_INTAKE_CALLBACK_AUTH==='hmac'
     ?verify({method:req.method,path:'/api/ocr-callback',timestamp,nonce,jobId,body,signature},
       {secret:env.ROLETA_INTAKE_HMAC_SECRET})
     :(()=>{throw Error('callback secret unavailable');})();
   const parsed=JSON.parse(body.toString('utf8'));
   if(probe){
    if(!parsed||Array.isArray(parsed)||parsed.probe!=='auth'||Object.keys(parsed).length!==1)
     return res.status(422).json({error:'Invalid probe payload'});
    // This proves only credential/envelope verification, not durable nonce or job handling.
    return res.status(200).json({status:'AUTHENTICATED_NO_WRITE'});
   }
   if(parsed && !Array.isArray(parsed) && parsed.status==='FAILED'){
    // Only bounded codes, never upstream error messages or credentials.
    const codes=['GEMINI_503_EXHAUSTED','GEMINI_RATE_LIMIT_EXHAUSTED','GEMINI_REQUEST_FAILED'];
    if(!codes.includes(parsed.error_code)||parsed.result!==undefined)
     return res.status(422).json({error:'Invalid failure envelope'});
    const r=await db(env).query('SELECT roleta_intake.fail_callback($1,$2,$3) AS outcome',
     [validated.jobId,validated.nonce,parsed.error_code]);
    const outcome=r.rows?.[0]?.outcome;
    if(!['FAILED_SAVED','ALREADY_FAILED','ALREADY_SAVED'].includes(outcome))throw Error('Unexpected persistence response');
    return res.status(200).json({status:outcome});
   }
   if(!parsed||Array.isArray(parsed)||typeof parsed!=='object'||
      typeof parsed.model_id!=='string'||!parsed.model_id||parsed.model_id.length>128||
      !parsed.result||Array.isArray(parsed.result)||!['object','string'].includes(typeof parsed.result))
      return res.status(422).json({error:'Invalid result envelope'});
   // Gemini module returns JSON as a string in Make; accept both JSON string and object.
   let result=parsed.result;
   if(typeof result==='string'){
    if(Buffer.byteLength(result,'utf8')>MAX)return res.status(413).json({error:'Result too large'});
    result=JSON.parse(result);
   }
   if(!result||Array.isArray(result)||typeof result!=='object'||!Array.isArray(result.linhas))return res.status(422).json({error:'Invalid Gemini JSON'});
   // Derive digest from the same canonical jsonb representation inside PostgreSQL.
   const r=await db(env).query(
    'SELECT roleta_intake.complete_signed_callback($1,$2,$3,$4::jsonb,encode(sha256(convert_to($4::jsonb::text,\'UTF8\')),\'hex\')) AS outcome',
    [validated.jobId,validated.nonce,parsed.model_id,JSON.stringify(result)]);
   const outcome=r.rows?.[0]?.outcome;
   if(!['SAVED','ALREADY_SAVED'].includes(outcome))throw Error('Unexpected persistence response');
   return res.status(200).json({status:outcome});
  }catch(e){
   const authError=/signature|timestamp|nonce|envelope|secret|credential|callback method/i.test(e.message);
   const conflict=e.code==='23505'||/conflicting Gemini completion/i.test(e.message);
   return res.status(authError?401:conflict?409:e.status===413?413:e.status===415?415:503).json({error:authError?'Invalid callback':conflict?'Conflicting or repeated callback':'Callback not persisted'});
  }
 };
}
module.exports=createHandler();
module.exports.config={api:{bodyParser:false}};
module.exports.createHandler=createHandler;
