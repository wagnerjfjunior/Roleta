'use strict';
const crypto=require('node:crypto'),a=require('../../../auth/google');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).end();
 let cfg;try{cfg=a.config();}catch{return res.status(503).send('Login Google ainda não configurado.');}
 const state=crypto.randomBytes(24).toString('base64url');
 const verifier=crypto.randomBytes(32).toString('base64url');
 const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
 const flow=a.seal({typ:'oauth',state,verifier,exp:Date.now()+a.MAX_FLOW*1000});
 res.setHeader('Set-Cookie',a.cookie(a.FLOW,flow,a.MAX_FLOW));
 const q=new URLSearchParams({client_id:cfg.clientId,redirect_uri:cfg.redirectUri,response_type:'code',scope:'openid email',state,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'});
 return res.redirect(302,'https://accounts.google.com/o/oauth2/v2/auth?'+q.toString());
};
