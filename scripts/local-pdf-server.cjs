'use strict';
// SFJM local-only PDF preview service. Not deployed as a Vercel API.
const http=require('node:http');
const {createPdf}=require('../lib/roleta-pdf');
const PORT=8083;
const ALLOWED=new Set(['http://localhost:8082','http://127.0.0.1:8082']);
function loopback(addr){return addr==='127.0.0.1'||addr==='::1'||addr==='::ffff:127.0.0.1';}
function createServer(){
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;
  if(!loopback(req.socket.remoteAddress)||!ALLOWED.has(origin)){res.writeHead(403);return res.end('Local origin required');}
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  if(req.method==='GET'&&req.url==='/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,mode:'SFJM local PDF'}));}
  if(req.method!=='POST'||req.url!=='/pdf'){res.writeHead(404);return res.end('Not found');}
  if(!String(req.headers['content-type']||'').startsWith('application/json')){res.writeHead(415);return res.end('JSON required');}
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>200000){res.writeHead(413);return res.end('Too large');}}
   const pdf=await createPdf(JSON.parse(raw));
   res.setHeader('Content-Type','application/pdf');
   res.setHeader('Content-Disposition','attachment; filename="Roleta-local-teste.pdf"');
   res.writeHead(200);res.end(pdf);
  }catch(error){res.writeHead(error.status===422||error instanceof SyntaxError?422:500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.status===422?error.message:'Falha ao gerar PDF local.'}));}
 });
}
if(require.main===module){createServer().listen(PORT,'127.0.0.1',()=>{process.stdout.write('Roleta PDF local pronta: http://127.0.0.1:'+PORT+' (somente loopback)\n');});}
module.exports={createServer};
