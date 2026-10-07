(function(global){
  'use strict';
  function counts(presence){const out={};for(const b of presence?.brokers||[])out[b]=0;for(const r of presence?.records||[])if(r.present&&Object.prototype.hasOwnProperty.call(out,r.broker))out[r.broker]++;return out}
  function resolve(policy,presence){
    if(!policy||!presence)return {family:[],saturday:[],sunday:[]};
    const observed=counts(presence),required=policy.qualification?.required_weekday_periods||5;
    const statusFor=a=>{const key=a.presence_key||a.broker,ov=presence.count_overrides?.[key],count=ov&&Number.isFinite(ov.count)?ov.count:(observed[key]||0),unresolved=ov?.status==='needs_exact_count';return {...a,count:unresolved?null:count,required,eligible:!unresolved&&count>=required,unresolved,missing:unresolved?null:Math.max(0,required-count)}};
    return {family:(policy.family_assignments||[]).map(statusFor),saturday:(policy.saturday?.assignments||[]).map(statusFor),sunday:(policy.sunday?.assignments||[]).map(statusFor)};
  }
  const api={resolve};global.RoletaWeekend=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
