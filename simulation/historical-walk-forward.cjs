'use strict';
// F2-09: conservative historical walk-forward. No current-event occupied positions used to select a pick.
const domain=require('../domain/core.js');
function dateKey(s){
 if(typeof s!=='string')return null;
 const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
 if(!m)return null;
 const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
 return d.getUTCFullYear()===+m[3]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[1]?d.toISOString().slice(0,10):null;
}
function weekKey(day){
 const d=new Date(day+'T00:00:00Z');
 const wd=(d.getUTCDay()+6)%7;
 d.setUTCDate(d.getUTCDate()-wd);
 return d.toISOString().slice(0,10);
}
function valid(e){
 const occupied=e.occupied;
 return Boolean(e.id&&dateKey(e.date)&&['manha','tarde','integral'].includes(e.period)&&Number.isInteger(e.N)&&e.N>=4&&Array.isArray(occupied)&&occupied.length===e.N&&new Set(occupied).size===e.N&&occupied.every(p=>Number.isInteger(p)&&p>0)&&occupied.includes(e.first)&&occupied.includes(e.last)&&e.first!==e.last);
}
function recommend(history,period){
 const ranked=domain.rankingForPeriod(history,period,{minExposure:3,minRowsForPeriod:6});
 return {positions:ranked.rows.slice(0,3).map(r=>r.pos),source:ranked.source};
}
function audit(events){
 const ids=new Set(),bySlot=new Map(),accepted=[],excluded=[];
 for(const e of events){
  if(ids.has(e.id)){excluded.push({id:e.id,reason:'duplicate_id'});continue}
  ids.add(e.id);
  if(!valid(e)){excluded.push({id:e.id,reason:'incomplete_or_invalid'});continue}
  const day=dateKey(e.date),slot=day+'|'+e.period;
  const x={...e,day,slot};
  accepted.push(x);
  bySlot.set(slot,(bySlot.get(slot)||0)+1);
 }
 const eligible=[],ambiguous=[];
 for(const e of accepted){
  if(bySlot.get(e.slot)>1){excluded.push({id:e.id,reason:'ambiguous_same_date_period'});ambiguous.push(e.id)}
  else eligible.push(e);
 }
 eligible.sort((a,b)=>a.day.localeCompare(b.day)||a.period.localeCompare(b.period)||String(a.id).localeCompare(String(b.id)));
 return {eligible,excluded,ambiguous};
}
function evaluate(events,{minTrain=12}={}){
 if(!Number.isInteger(minTrain)||minTrain<1)throw new Error('Invalid minTrain');
 const {eligible,excluded,ambiguous}=audit(events);
 const output=[],warmup=[];
 for(const e of eligible){
  // Conservative cutoff: exclude ALL same-day results (no verified publication timestamps).
  const currentHistory=eligible.filter(x=>x.day<e.day);
  const wk=weekKey(e.day);
  const weeklyHistory=eligible.filter(x=>x.day<wk);
  if(currentHistory.length<minTrain||weeklyHistory.length<minTrain){
   warmup.push(e.id);continue;
  }
  const plans={weekly:recommend(weeklyHistory,e.period),current:recommend(currentHistory,e.period)};
  const observation={id:e.id,date:e.day,period:e.period,N:e.N,week:wk,training:{weekly:weeklyHistory.map(x=>x.id),current:currentHistory.map(x=>x.id)},plans:{}};
  for(const policy of ['weekly','current']){
   const plan=plans[policy];
   // Ranking is independent of this event's occupied array; eligibility evaluated only after prediction.
   const pick=plan.positions.find(p=>e.occupied.includes(p))??null;
   observation.plans[policy]={primary:plan.positions[0]??null,candidates:plan.positions,ranking_source:plan.source,posthoc_eligible_pick:pick,hit:pick!==null&&(pick===e.first||pick===e.last)?1:0,expected:pick!==null?2/e.N:0};
  }
  observation.paired_valid=observation.plans.weekly.posthoc_eligible_pick!==null&&observation.plans.current.posthoc_eligible_pick!==null;
  output.push(observation);
 }
 const paired=output.filter(x=>x.paired_valid);
 const sum=(arr,fn)=>arr.reduce((n,x)=>n+fn(x),0);
 return {schema:'rlt-f2-09-historical-walk-forward-v1',mode:'retrospective_backtest_not_live_prospective',assumption:'same-day outcomes unavailable; positions evaluated posthoc; not executable ex-ante without occupied snapshot',total_input:events.length,structural_eligible:eligible.length,excluded,warmup,ambiguous,observations:output,summary:{evaluated:output.length,paired_valid:paired.length,weekly_hits:sum(paired,x=>x.plans.weekly.hit),current_hits:sum(paired,x=>x.plans.current.hit),weekly_expected:sum(paired,x=>x.plans.weekly.expected),current_expected:sum(paired,x=>x.plans.current.expected),delta_paired_hits:sum(paired,x=>x.plans.current.hit-x.plans.weekly.hit),weekly_operational_coverage:sum(output,x=>x.plans.weekly.posthoc_eligible_pick!==null?1:0),current_operational_coverage:sum(output,x=>x.plans.current.posthoc_eligible_pick!==null?1:0)}};
}
module.exports={dateKey,weekKey,audit,evaluate};
