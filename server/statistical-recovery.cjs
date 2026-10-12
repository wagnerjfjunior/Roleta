'use strict';
// Recover only the unchanged, fully validated atomic intake commit. Never move refs.
const SHA=/^[a-f0-9]{40}$/;
const conflict=message=>Object.assign(Error(message),{status:409});
async function recover({gh,branch,headSha,event,actorHash,digest,createPr}){
 const fail=message=>{throw conflict(message);};
 if(!SHA.test(headSha||''))fail('unverified branch SHA');
 const decode=async(path,sha)=>{
  const r=await gh('GET','/contents/'+path+'?ref='+sha);
  if(r.encoding&&r.encoding!=='base64')fail('unsupported GitHub content encoding');
  return Buffer.from(r.content||'','base64').toString('utf8');
 };
 const proof=JSON.parse(await decode('data/intake-proofs/'+event.event_id+'.json',headSha));
 if(proof.schema!=='rlt-statistical-proof-v1'||proof.event_id!==event.event_id||
    proof.payload_sha256!==digest||proof.actor_hash!==actorHash||proof.human_review_confirmed!==true)
  fail('staged submission conflict');
 // Include closed PRs: recovery must not resurrect a rejected or merged proposal.
 const prs=await gh('GET','/pulls?state=all&base=main&head='+encodeURIComponent('wagnerjfjunior:'+branch)+'&per_page=100');
 if(!Array.isArray(prs)||prs.length>1)fail('ambiguous staged PR history');
 const result=pr=>{
  if(pr.state!=='open'||pr.head?.sha!==headSha||pr.head?.ref!==branch||
     pr.base?.ref!=='main'||pr.head?.repo?.full_name!=='wagnerjfjunior/Roleta'||
     !Number.isSafeInteger(pr.number)||!/^https:\/\/github\.com\/wagnerjfjunior\/Roleta\/pull\/\d+$/.test(pr.html_url||''))
   fail('PR is closed or no longer bound to staged commit');
  return {status:'pending_review',event_id:event.event_id,pr_number:pr.number,pr_url:pr.html_url,replayed:true};
 };
 if(prs.length)return result(prs[0]);
 const main=await gh('GET','/git/ref/heads/main'),base=main.object?.sha;
 if(!SHA.test(base||''))fail('invalid main SHA');
 const commit=await gh('GET','/git/commits/'+headSha);
 if(commit.sha!==headSha||commit.parents?.length!==1||commit.parents[0].sha!==base)
  fail('STALE_BASE or non-atomic orphan');
 const comparison=await gh('GET','/compare/'+base+'...'+headSha);
 if(comparison.status!=='ahead'||comparison.ahead_by!==1||comparison.behind_by!==0||comparison.merge_base_commit?.sha!==base)
  fail('unverified orphan ancestry');
 const paths=(comparison.files||[]).map(x=>x.filename).sort();
 const wanted=['data/manifest.json','data/incoming/'+event.event_id+'.csv','data/intake-proofs/'+event.event_id+'.json'].sort();
 if(JSON.stringify(paths)!==JSON.stringify(wanted)||comparison.files.some(x=>x.status!=='added'&&x.filename!=='data/manifest.json'))
  fail('orphan changed unexpected paths');
 // Reuse the SAME content validator as the trusted GitHub gate, with pinned bytes.
 const files=new Map();
 for(const p of wanted)files.set(headSha+':'+p,await decode(p,headSha));
 const raw=await decode('data/manifest.json',base);files.set(base+':data/manifest.json',raw);
 const manifest=JSON.parse(raw);
 for(const s of manifest.sources){
  if(!/^\/data\/(?:events\.csv|incoming\/\d{4}-\d{2}-\d{2}(?:-[MTI])?\.csv)$/.test(s.path||''))fail('untrusted source');
  files.set(base+':'+s.path.slice(1),await decode(s.path.slice(1),base));
 }
 const read=(...args)=>{
  if(args[0]==='rev-parse')return args[2].slice(0,40);
  if(args[0]==='merge-base')return base;
  if(args[0]==='rev-list')return '';
  if(args[0]==='diff')return paths.join('\n');
  if(args[0]==='show'&&files.has(args[1]))return files.get(args[1]);
  fail('unexpected validation read');
 };
 require('../scripts/gate-e/validate-intake-pr.cjs').inspect({base,head:headSha,read});
 // Close the read-to-write window as far as API staging allows. Merge freshness
 // remains a mandatory GitHub protection; PR creation never authorizes merge.
 const current=await gh('GET','/git/ref/heads/main'),ref=await gh('GET','/git/ref/heads/'+branch);
 if(current.object?.sha!==base||ref.object?.sha!==headSha)fail('refs changed during recovery');
 try{return {...await createPr(),recovered:true};}
 catch(error){
  if(error.status!==409&&error.status!==502)throw error;
  const found=await gh('GET','/pulls?state=all&base=main&head='+encodeURIComponent('wagnerjfjunior:'+branch)+'&per_page=100');
  if(Array.isArray(found)&&found.length===1)return {...result(found[0]),recovered:true};
  throw error;
 }
}
module.exports={recover};
