'use strict';
const crypto=require('node:crypto');
const COOKIE='rlt_session',FLOW='rlt_oauth_flow',MAX_SESSION=8*3600,MAX_FLOW=600;
const b64=b=>Buffer.from(b).toString('base64url');
const secret=()=>{const s=process.env.ROLETA_SESSION_SECRET;if(!s||s.length<32)throw Error('Session not configured');return s;};
function seal(data){const p=b64(JSON.stringify(data)),mac=crypto.createHmac('sha256',secret()).update(p).digest('base64url');return p+'.'+mac;}
function unseal(v){if(!v||typeof v!=='string')return null;const parts=v.split('.');if(parts.length!==2)return null;const expected=crypto.createHmac('sha256',secret()).update(parts[0]).digest();let supplied;try{supplied=Buffer.from(parts[1],'base64url');}catch{return null;}if(expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied))return null;try{return JSON.parse(Buffer.from(parts[0],'base64url').toString());}catch{return null;}}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.includes('=')).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));}
function cookie(name,value,seconds){return name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+seconds;}
const allowed=()=>new Set(String(process.env.ROLETA_GOOGLE_ALLOWED_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
function session(req){let p=unseal(cookies(req)[COOKIE]);if(!p||p.typ!=='session'||!p.email||!p.sub||!p.exp||Date.now()>p.exp||!allowed().has(p.email))return null;return {email:p.email,sub:p.sub};}
function site(){const x=process.env.ROLETA_SITE_ORIGIN;const u=new URL(x);if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash)throw Error('Invalid site origin');return u.origin;}
function config(){if(!process.env.ROLETA_GOOGLE_CLIENT_ID||!process.env.ROLETA_GOOGLE_CLIENT_SECRET||allowed().size===0)throw Error('Google SSO not configured');return {clientId:process.env.ROLETA_GOOGLE_CLIENT_ID,clientSecret:process.env.ROLETA_GOOGLE_CLIENT_SECRET,redirectUri:site()+'/api/auth/google/callback'};}
function flow(req){const p=unseal(cookies(req)[FLOW]);return p&&p.typ==='oauth'&&Date.now()<p.exp?p:null;}
function clearFlow(){return cookie(FLOW,'',0);}
function requireSameOrigin(req){try{const o=new URL(String(req.headers.origin||''));return o.origin===site();}catch{return false;}}
function csrfForSub(sub){return crypto.createHmac('sha256',secret()).update('csrf:'+sub).digest('base64url');}
module.exports={COOKIE,FLOW,MAX_SESSION,MAX_FLOW,seal,unseal,cookies,cookie,allowed,session,site,config,flow,clearFlow,requireSameOrigin,csrfForSub};
