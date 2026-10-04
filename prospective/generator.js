(function(global){
  'use strict';

  function makeId(prefix,eventId,person,strategy,revision){
    return [prefix,eventId,person,strategy,String(revision)].join('-').replace(/[^A-Za-z0-9_-]+/g,'_');
  }

  function scheduleBatch(ledger,events,schedule,meta){
    if(!ledger)throw new Error('Prospective ledger core unavailable.');
    if(!meta||!meta.generated_at||!meta.data_cutoff||!meta.config_hash)throw new Error('Batch generation requires generated_at, data_cutoff and config_hash.');
    const recommendations=[];
    const randomShadows=[];

    for(const target of schedule||[]){
      const allocations=ledger.allocateFamilies(events,target,{
        people:ledger.PEOPLE,
        fallbackCount:2,
        minExposure:3
      });

      for(const base of allocations){
        for(const strategy of ['WEEKLY_FROZEN','CURRENT']){
          const revision=0;
          recommendations.push(ledger.freezeRecord(base,{
            recommendation_id:makeId('REC',target.id,base.person_id,strategy,revision),
            strategy,
            generated_at:meta.generated_at,
            data_cutoff:meta.data_cutoff,
            trigger_event_id:meta.trigger_event_id||null,
            config_hash:meta.config_hash,
            revision_number:revision
          }));
        }

        const candidateUniverse=ledger.rankingFor(events,target.period,3).rows.map(r=>r.pos);
        const seed=['roleta-prospective-v1',target.id,base.person_id].join('|');
        const chain=ledger.deterministicChain(candidateUniverse,seed);
        randomShadows.push(Object.freeze({
          recommendation_id:makeId('RND',target.id,base.person_id,'RANDOM_SHADOW',0),
          person_id:base.person_id,
          target_event_id:target.id,
          target_date:target.date,
          target_period:target.period,
          strategy:'RANDOM_SHADOW',
          candidate_chain:chain,
          physical_position:null,
          generated_at:meta.generated_at,
          data_cutoff:meta.data_cutoff,
          model_family:'random_shadow',
          model_version:'RANDOM-SHADOW-V1',
          policy_version:ledger.POLICY_VERSION,
          config_hash:meta.config_hash,
          status:'FROZEN_CHAIN',
          is_frozen:true,
          frozen_at:meta.generated_at
        }));
      }
    }

    return {
      recommendations,
      random_shadows:randomShadows,
      summary:{
        target_events:(schedule||[]).length,
        people:ledger.PEOPLE.length,
        weekly_frozen:recommendations.filter(x=>x.strategy==='WEEKLY_FROZEN').length,
        current:recommendations.filter(x=>x.strategy==='CURRENT').length,
        random_shadow:randomShadows.length
      }
    };
  }

  function selfTest(ledger){
    const history=[];
    for(const period of ['manha','tarde','integral']){
      for(let i=0;i<4;i++){
        history.push({
          id:period+i,period,N:8,occupied:[1,2,3,4,5,6,7,8],
          first:(i%4)+1,last:8-(i%4)
        });
      }
    }
    const schedule=[
      {id:'2099-01-01-manha',date:'01/01/2099',period:'manha'},
      {id:'2099-01-01-tarde',date:'01/01/2099',period:'tarde'},
      {id:'2099-01-02-integral',date:'02/01/2099',period:'integral'}
    ];
    const out=scheduleBatch(ledger,history,schedule,{
      generated_at:'2098-12-31T20:00:00-03:00',
      data_cutoff:'integral3',
      config_hash:'TEST'
    });
    if(out.summary.weekly_frozen!==12)throw new Error('Weekly batch count failed.');
    if(out.summary.current!==12)throw new Error('Current batch count failed.');
    if(out.summary.random_shadow!==12)throw new Error('Random shadow count failed.');
    return {pass:true,summary:out.summary};
  }

  global.RoletaProspectiveGenerator={scheduleBatch,selfTest};
  if(typeof module!=='undefined'&&module.exports)module.exports=global.RoletaProspectiveGenerator;
})(typeof globalThis!=='undefined'?globalThis:this);
