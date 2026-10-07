(function(global){
  'use strict';

  const DEFAULT_MIN_EXPOSURE=3;

  function chance2x(eventOrN){
    const n=typeof eventOrN==='number'?eventOrN:Number(eventOrN?.N);
    return Number.isFinite(n)&&n>0?Math.min(1,2/n):0;
  }

  function eligible(event,pos){
    return Array.isArray(event?.occupied)&&event.occupied.includes(pos);
  }

  function hit2x(event,pos){
    return Boolean(event)&&(event.first===pos||event.last===pos);
  }

  function scoreRows(events){
    const map=new Map();
    for(const event of events||[]){
      if(!Number.isFinite(event?.N)||!Array.isArray(event?.occupied))continue;
      const expected=chance2x(event);
      for(const pos of event.occupied){
        if(!Number.isFinite(pos))continue;
        if(!map.has(pos))map.set(pos,{pos,exposure:0,hits:0,expected:0});
        const row=map.get(pos);
        row.exposure++;
        row.expected+=expected;
        if(hit2x(event,pos))row.hits++;
      }
    }
    return [...map.values()].map(row=>({
      ...row,
      oe:row.expected?row.hits/row.expected:0,
      excess:row.hits-row.expected
    }));
  }

  function rankRows(rows,minExposure=DEFAULT_MIN_EXPOSURE){
    return (rows||[]).filter(row=>row.exposure>=minExposure)
      .sort((a,b)=>b.excess-a.excess||b.hits-a.hits||b.oe-a.oe||b.exposure-a.exposure||a.pos-b.pos);
  }

  function rankEvents(events,minExposure=DEFAULT_MIN_EXPOSURE){
    return rankRows(scoreRows(events),minExposure);
  }

  function rankingForPeriod(events,period,options={}){
    const minExposure=Number.isFinite(options.minExposure)?options.minExposure:DEFAULT_MIN_EXPOSURE;
    const minRowsForPeriod=Number.isFinite(options.minRowsForPeriod)?options.minRowsForPeriod:6;
    const periodRows=rankEvents((events||[]).filter(event=>event.period===period),minExposure);
    if(periodRows.length>=minRowsForPeriod)return {source:'period_raw',rows:periodRows};
    return {source:'global_fallback',rows:rankEvents(events||[],minExposure)};
  }

  function selfTest(){
    const events=[
      {id:'A',period:'manha',N:4,occupied:[1,2,3,4],first:1,last:4},
      {id:'B',period:'manha',N:4,occupied:[1,2,3,4],first:2,last:3}
    ];
    if(chance2x(4)!==0.5)throw new Error('chance2x failed.');
    if(!eligible(events[0],1)||eligible(events[0],5))throw new Error('eligible failed.');
    if(!hit2x(events[0],1)||hit2x(events[0],2))throw new Error('hit2x failed.');
    const ranked=rankEvents(events,1);
    if(ranked.length!==4)throw new Error('rankEvents failed.');
    return {pass:true};
  }

  const api={
    DEFAULT_MIN_EXPOSURE,
    chance2x,
    eligible,
    hit2x,
    scoreRows,
    rankRows,
    rankEvents,
    rankingForPeriod,
    selfTest
  };

  global.RoletaDomainCore=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
