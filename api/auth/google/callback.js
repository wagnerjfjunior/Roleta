'use strict';
const crypto=require('node:crypto'),a=require('../../../auth/google');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).end();
 res.setHeader('Set-Cookie',a.clearFlow());
 let cfg;try{cfg=a.config();}catch{return res.status(503).send('Login não configurado.');}
 const state=req.query?.state,code=req.query?.code,p=a.flow(req);
 if(!p||!state||!code||typeof code!=='string'||p.state.length!==String(state).length||!crypto.timingSafeEqual(Buffer.from(p.state),Buffer.from(String(state))))return res.status(403).send('Sessão Google expirada ou inválida.');
 try{
 const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:cfg.clientId,client_secret:cfg.clientSecret,redirect_uri:cfg.redirectUri,grant_type:'authorization_code',code_verifier:p.verifier}),signal:AbortSignal.timeout(12000)});
 if(!tokenResponse.ok)throw Error('token');
 const token=await tokenResponse.json();if(!token.access_token)throw Error('token');
 const userResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(12000)});
 if(!userResponse.ok)throw Error('userinfo');
 const u=await userResponse.json();const email=String(u.email||'').toLowerCase();
 if(u.email_verified!==true||!u.sub||!a.allowed().has(email))return res.status(403).send('Conta Google não autorizada para a Roleta.');
 const signed=a.seal({typ:'session',email,sub:u.sub,exp:Date.now()+a.MAX_SESSION*1000});
 res.setHeader('Set-Cookie',[a.clearFlow(),a.cookie(a.COOKIE,signed,a.MAX_SESSION)]);
 return res.redirect(302,a.site()+'/#nova-roleta');
 }catch{return res.status(502).send('Não foi possível concluir o login Google. Tente novamente.');}
};
