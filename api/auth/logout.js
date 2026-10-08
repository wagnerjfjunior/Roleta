'use strict';
const a=require('../../auth/google');
module.exports=(req,res)=>{res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).end();let s;try{s=a.session(req);}catch{}if(!s||!a.requireSameOrigin(req)||req.headers['x-roleta-csrf']!==a.csrfForSub(s.sub))return res.status(403).json({error:'Requisição não autorizada.'});res.setHeader('Set-Cookie',a.cookie(a.COOKIE,'',0));return res.status(200).json({loggedOut:true});};
