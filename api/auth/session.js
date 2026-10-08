'use strict';
const a=require('../../auth/google');
module.exports=(req,res)=>{res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).end();let s=null;try{s=a.session(req);}catch{}return res.status(200).json({authenticated:!!s,email:s?.email||null,csrfToken:s?a.csrfForSub(s.sub):null});};
