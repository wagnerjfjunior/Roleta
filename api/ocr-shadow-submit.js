'use strict';
// Keep the Hobby deployment at 12 functions. Each handler retains its own gates.
const shadow=require('../server/ocr-shadow-handler.cjs');
const submit=require('../server/ocr-job-submit-handler.cjs');
const status=require('../server/ocr-job-status-handler.cjs');
const callback=require('../server/ocr-callback-handler.cjs');
function createRouter(handlers={}){
 const routes={shadow,submit,status,callback,...handlers};
 return (req,res)=>{
  const url=new URL(req.url||'/api/ocr-shadow-submit','https://roleta.invalid');
  const names={'/api/ocr-job-submit':'submit','/api/ocr-job-status':'status','/api/ocr-callback':'callback'};
  const target=names[url.pathname]||url.searchParams.get('__intake')||req.query?.__intake||'shadow';
  if(!['shadow','submit','status','callback'].includes(target)){
   res.setHeader('Cache-Control','no-store');return res.status(404).json({error:'Unknown OCR route'});
  }
  return routes[target](req,res);
 };
}
module.exports=createRouter();
module.exports.config={api:{bodyParser:false}};
module.exports.createRouter=createRouter;
// Preserve the legacy module interface used by the shadow regression suite.
for(const name of ['createHandler','SQL','storePhoto','capability'])module.exports[name]=shadow[name];
