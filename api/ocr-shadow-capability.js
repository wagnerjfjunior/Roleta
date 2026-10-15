'use strict';
const auth=require('../auth/google');
function createHandler({env=process.env,authenticate=auth}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({enabled:false});}
  try{
   if(!authenticate.session(req))return res.status(200).json({enabled:false});
  }catch{return res.status(200).json({enabled:false});}
  const enabled=env.ROLETA_OCR_SHADOW_ENABLED==='true'
    &&env.ROLETA_OCR_RETENTION_READY==='true'
    &&!!env.ROLETA_OCR_STORAGE_SERVICE_KEY
    &&env.ROLETA_OCR_SUPABASE_URL==='https://uobxxgzshrmbtjfdolxd.supabase.co'
    &&env.ROLETA_FINAL_READS_ENABLED==='true'
    &&!!env.ROLETA_V2_DATABASE_URL;
  return res.status(200).json({enabled});
 };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
