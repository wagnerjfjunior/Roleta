(function(global){
  'use strict';

  const POLICY_VERSION='PROSPECTIVE-V1.0.0';
  const MODEL_VERSION='RLT-M5-WEEKLY-V1';
  const PEOPLE=['Wagner','Laura','Brenda','Helena'];
  const core=global.RoletaDomainCore||(typeof module!=='undefined'&&module.exports?require('../domain/core.js'):null);
  if(!core)throw new Error('RoletaDomainCore unavailable.');

  function rankingFor(events,period,minExposure=3){
    return core.rankingForPeriod(events,period,{
      minExposure,
      minRowsForPeriod:PEOPLE.length+2
    });
  }

  function allocateFamilies(events,targetEvent,options={}){
    const people=options.people||PEOPLE;
    const fallbackCount=Number.isFinite(options.fallbackCount)?options.fallbackCount:2;
    const ranked=rankingFor(events,targetEvent.period,options.minExposure||3);
    const positions=ranked.rows.map(r=>r.pos);
    if(positions.length<people.length)throw new Error('Amostra insuficiente para alocar posições distintas.');

    const used=new Set();
    const out=[];
    let cursor=0;
    for(const person of people){
      while(cursor<positions.length&&used.has(positions[cursor]))cursor++;
      const primary=positions[cursor++];
      if(!Number.isFinite(primary))throw new Error('Sem posição primária para '+person);
      used.add(primary);

      const fallbacks=[];
      for(const p of positions){
        if(fallbacks.length>=fallbackCount)break;
        if(p!==primary&&!fallbacks.includes(p))fallbacks.push(p);
      }
      out.push({
        person_id:person,
        target_event_id:targetEvent.id,
        target_date:targetEvent.date,
        target_period:targetEvent.period,
        physical_position:primary,
        fallback_positions:fallbacks,
        ranking_source:ranked.source
      });
    }
    return out;
  }

  function hashSeed(input){
    let h=2166136261>>>0;
    const s=String(input||'');
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return h>>>0;
  }

  function deterministicChain(candidates,seed){
    const a=[...new Set((candidates||[]).filter(Number.isFinite))];
    let x=hashSeed(seed);
    function rng(){
      x|=0;x=x+0x6D2B79F5|0;
      let t=Math.imul(x^x>>>15,1|x);
      t=t+Math.imul(t^t>>>7,61|t)^t;
      return ((t^t>>>14)>>>0)/4294967296;
    }
    for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  }

  function resolveFirstEligible(chain,occupied){
    const set=new Set(occupied||[]);
    return (chain||[]).find(p=>set.has(p))??null;
  }

  function freezeRecord(base,meta){
    if(!base||!Number.isFinite(base.physical_position))throw new Error('Recommendation requires physical_position.');
    if(!meta||!meta.data_cutoff||!meta.generated_at)throw new Error('Freeze requires data_cutoff and generated_at.');
    return Object.freeze({
      recommendation_id:meta.recommendation_id,
      person_id:base.person_id,
      target_event_id:base.target_event_id,
      target_date:base.target_date,
      target_period:base.target_period,
      strategy:meta.strategy,
      physical_position:base.physical_position,
      fallback_positions:[...(base.fallback_positions||[])],
      previous_position:meta.previous_position??null,
      revision_number:meta.revision_number||0,
      generated_at:meta.generated_at,
      data_cutoff:meta.data_cutoff,
      trigger_event_id:meta.trigger_event_id||null,
      model_family:'period_raw_global_fallback',
      model_version:MODEL_VERSION,
      policy_version:POLICY_VERSION,
      config_hash:meta.config_hash,
      status:'FROZEN',
      is_frozen:true,
      frozen_at:meta.frozen_at||meta.generated_at,
      supersedes_recommendation_id:meta.supersedes_recommendation_id||null,
      ranking_source:base.ranking_source
    });
  }

  function createDraftRecord(base,meta){
    if(!base||!Number.isFinite(base.physical_position))throw new Error('Recommendation requires physical_position.');
    if(!meta||!meta.data_cutoff||!meta.generated_at)throw new Error('Draft requires data_cutoff and generated_at.');
    if(meta.strategy!=='CURRENT')throw new Error('Only CURRENT may be created as a draft recommendation.');
    return Object.freeze({
      recommendation_id:meta.recommendation_id,
      person_id:base.person_id,
      target_event_id:base.target_event_id,
      target_date:base.target_date,
      target_period:base.target_period,
      strategy:'CURRENT',
      physical_position:base.physical_position,
      fallback_positions:[...(base.fallback_positions||[])],
      previous_position:meta.previous_position??null,
      revision_number:meta.revision_number||0,
      generated_at:meta.generated_at,
      data_cutoff:meta.data_cutoff,
      trigger_event_id:meta.trigger_event_id||null,
      model_family:'period_raw_global_fallback',
      model_version:MODEL_VERSION,
      policy_version:POLICY_VERSION,
      config_hash:meta.config_hash,
      status:'DRAFT',
      is_frozen:false,
      frozen_at:null,
      supersedes_recommendation_id:meta.supersedes_recommendation_id||null,
      ranking_source:base.ranking_source
    });
  }

  function canonicalTargetEventId(event,targetEventId){
    if(!event)return null;
    if(event.id===targetEventId||event.target_event_id===targetEventId)return targetEventId;
    const m=String(targetEventId||'').match(/^(\d{4})-(\d{2})-(\d{2})-(manha|tarde|integral)$/);
    if(!m)return null;
    const suffix={manha:'M',tarde:'T',integral:'I'}[m[4]];
    const shortId=m[3]+'-'+m[2]+'-'+suffix;
    return String(event.id||'')===shortId?targetEventId:null;
  }

  function adjudicate(rec,event,at){
    if(!rec||rec.status!=='FROZEN'||!rec.is_frozen)throw new Error('Only frozen recommendations can be adjudicated.');
    if(!event||canonicalTargetEventId(event,rec.target_event_id)!==rec.target_event_id)throw new Error('Outcome event mismatch.');
    const hit2=event.first===rec.physical_position||event.last===rec.physical_position;
    const hit3=hit2||event.courtesy===rec.physical_position;
    const hit4=hit3||event.second===rec.physical_position;
    return Object.freeze({
      adjudication_id:'ADJ-'+rec.recommendation_id,
      recommendation_id:rec.recommendation_id,
      target_event_id:rec.target_event_id,
      outcome_event_id:event.id,
      N:event.N,
      eligible_positions:[...(event.occupied||[])],
      outcome_first:event.first,
      outcome_second:event.second,
      outcome_courtesy:event.courtesy,
      outcome_last:event.last,
      hit_2x:hit2,
      hit_3x:hit3,
      hit_4x:hit4,
      expected_probability_2x:core.chance2x(event),
      adjudicated_at:at
    });
  }

  function selfTest(){
    const history=[
      {id:'A',period:'manha',N:6,occupied:[1,2,3,4,5,6],first:1,last:6},
      {id:'B',period:'manha',N:6,occupied:[1,2,3,4,5,6],first:1,last:5},
      {id:'C',period:'manha',N:6,occupied:[1,2,3,4,5,6],first:2,last:6},
      {id:'D',period:'tarde',N:6,occupied:[1,2,3,4,5,6],first:3,last:4},
      {id:'E',period:'tarde',N:6,occupied:[1,2,3,4,5,6],first:3,last:5},
      {id:'F',period:'tarde',N:6,occupied:[1,2,3,4,5,6],first:4,last:6}
    ];
    const target={id:'2099-01-01-manha',date:'01/01/2099',period:'manha'};
    const alloc=allocateFamilies(history,target,{minExposure:1});
    if(alloc.length!==4||new Set(alloc.map(x=>x.physical_position)).size!==4)throw new Error('Distinct allocation failed.');

    core.selfTest();
    const frozen=freezeRecord(alloc[0],{
      recommendation_id:'REC-TEST-1',strategy:'WEEKLY_FROZEN',
      generated_at:'2098-12-31T20:00:00-03:00',data_cutoff:'F',
      config_hash:'TEST'
    });
    const draft=createDraftRecord(alloc[0],{
      recommendation_id:'REC-TEST-CURRENT-1',strategy:'CURRENT',
      generated_at:'2098-12-31T20:00:00-03:00',data_cutoff:'F',
      config_hash:'TEST'
    });
    if(draft.status!=='DRAFT'||draft.is_frozen||draft.frozen_at!==null)throw new Error('CURRENT draft state failed.');
    let mutationBlocked=false;
    try{frozen.physical_position=99}catch(_){mutationBlocked=true}
    if(frozen.physical_position===99)throw new Error('Frozen recommendation mutated.');

    const outcome={id:target.id,N:6,occupied:[1,2,3,4,5,6],first:frozen.physical_position,second:2,courtesy:5,last:6};
    const adj=adjudicate(frozen,outcome,'2099-01-01T09:00:00-03:00');
    if(!adj.hit_2x)throw new Error('Adjudication failed.');

    const canonicalShort={...outcome,id:'01-01-M'};
    const adjShort=adjudicate(frozen,canonicalShort,'2099-01-01T09:00:00-03:00');
    if(adjShort.target_event_id!==target.id)throw new Error('Canonical short event ID mapping failed.');

    let wrongOutcomeBlocked=false;
    try{adjudicate(frozen,{...outcome,id:'OTHER'},'2099-01-01T09:00:00-03:00')}catch(_){wrongOutcomeBlocked=true}
    if(!wrongOutcomeBlocked)throw new Error('Mismatched outcome was accepted.');

    const c1=deterministicChain([1,2,3,4,5,6],'seed');
    const c2=deterministicChain([1,2,3,4,5,6],'seed');
    if(c1.join(',')!==c2.join(','))throw new Error('Random shadow is not deterministic.');

    return {
      pass:true,
      checks:{
        distinct_family_allocation:true,
        frozen_immutable:true,
        event_identity_guard:true,
        canonical_event_id_mapping:true,
        adjudication_after_freeze:true,
        deterministic_random_shadow:true
      }
    };
  }

  global.RoletaProspectiveLedger={
    POLICY_VERSION,MODEL_VERSION,PEOPLE,
    rankingFor,allocateFamilies,deterministicChain,resolveFirstEligible,freezeRecord,createDraftRecord,canonicalTargetEventId,adjudicate,selfTest
  };

  if(typeof module!=='undefined'&&module.exports)module.exports=global.RoletaProspectiveLedger;
})(typeof globalThis!=='undefined'?globalThis:this);
