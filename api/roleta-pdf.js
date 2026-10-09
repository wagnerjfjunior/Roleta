'use strict';
const crypto=require('node:crypto');
const auth=require('../auth/google');
const {createPdf}=require('../lib/roleta-pdf');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
 if(!auth.requireSameOrigin(req))return res.status(403).json({error:'Origem não autorizada.'});
 let session;try{session=auth.session(req);}catch{}
 if(!session)return res.status(401).json({error:'Entre com Google para exportar o PDF.'});
 const token=req.headers['x-roleta-csrf'];
 const expected=Buffer.from(auth.csrfForSub(session.sub));
 const supplied=typeof token==='string'?Buffer.from(token):Buffer.alloc(0);
 if(expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied))return res.status(403).json({error:'Confirmação de segurança inválida.'});
 try{
  if(Number(req.headers['content-length']||0)>200000)return res.status(413).json({error:'Dados excedem o limite permitido.'});
  const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const pdf=await createPdf(input);
  const date=String(input.evento.data).replace(/\//g,'-');
  const period=String(input.evento.periodo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition','attachment; filename="Roleta-'+date+'-'+period+'.pdf"');
  res.setHeader('Content-Length',String(pdf.length));
  return res.status(200).send(pdf);
 }catch(e){if(e.status===422||e instanceof SyntaxError)return res.status(422).json({error:e.message||'Dados inválidos.'});return res.status(500).json({error:'Não foi possível gerar o PDF.'});}
};
