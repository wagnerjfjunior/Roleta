(function(global){
  'use strict';

  const STATUS=Object.freeze({
    EXACT:'RESOLVED_EXACT',
    ALIAS:'RESOLVED_ALIAS',
    CANDIDATES:'CANDIDATES_FOUND',
    TEAM_TIEBREAK:'TEAM_TIEBREAK',
    PENDING_HUMAN:'PENDING_HUMAN',
    CANONICAL:'CANONICAL_CONFIRMED',
    UNKNOWN:'UNKNOWN'
  });

  function normalize(value){
    return String(value??'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]/g,'');
  }

  function distance(a,b){
    a=normalize(a); b=normalize(b);
    if(a===b)return 0;
    if(!a.length)return b.length;
    if(!b.length)return a.length;
    const prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let left=i,diag=i-1;
      for(let j=1;j<=b.length;j++){
        const up=prev[j];
        const cur=Math.min(left+1,up+1,diag+(a[i-1]===b[j-1]?0:1));
        prev[j]=cur; diag=up; left=cur;
      }
    }
    return prev[b.length];
  }

  function similarity(a,b){
    const aa=normalize(a),bb=normalize(b);
    const denom=Math.max(aa.length,bb.length,1);
    return 1-distance(aa,bb)/denom;
  }

  function buildRegistry(rows){
    return (rows||[]).map((r,index)=>({
      registry_index:index,
      name:r.name??r['Nome Comercial'],
      team:r.team??r['Equipe']??null,
      director:r.director??r['Diretor']??null,
      creci:r.creci??r['CRECI']??null,
      role:r.role??r['Cargo']??null
    })).filter(r=>r.name);
  }

  function candidateList(observed,registry,options={}){
    const minSimilarity=Number.isFinite(options.minSimilarity)?options.minSimilarity:0.72;
    const aliases=options.aliases||{};
    const needle=normalize(observed);
    const exact=registry.filter(r=>normalize(r.name)===needle);
    if(exact.length)return {method:'exact',candidates:exact.map(r=>({...r,similarity:1}))};

    const aliasTarget=aliases[needle]||aliases[observed];
    if(aliasTarget){
      const alias=registry.filter(r=>normalize(r.name)===normalize(aliasTarget));
      if(alias.length)return {method:'alias',candidates:alias.map(r=>({...r,similarity:1}))};
    }

    const fuzzy=registry.map(r=>({...r,similarity:similarity(observed,r.name)}))
      .filter(r=>r.similarity>=minSimilarity)
      .sort((a,b)=>b.similarity-a.similarity||String(a.name).localeCompare(String(b.name)));
    return {method:'fuzzy',candidates:fuzzy};
  }

  function reconcile(observed,registryRows,context={},options={}){
    const registry=buildRegistry(registryRows);
    const found=candidateList(observed,registry,options);
    if(found.method==='exact'&&found.candidates.length===1){
      return {observed,status:STATUS.EXACT,candidates:found.candidates,selected:found.candidates[0],requires_human:false,canonical_for_statistics:true};
    }
    if(found.method==='alias'&&found.candidates.length===1){
      return {observed,status:STATUS.ALIAS,candidates:found.candidates,selected:found.candidates[0],requires_human:false,canonical_for_statistics:true};
    }
    if(!found.candidates.length){
      return {observed,status:STATUS.UNKNOWN,candidates:[],selected:null,requires_human:true,canonical_for_statistics:false};
    }

    // Equipe/gerente is NEVER a primary identity signal. It can only reduce
    // an already plausible candidate set.
    let candidates=found.candidates;
    let usedTeamTiebreak=false;
    if(candidates.length>1&&context.team){
      const byTeam=candidates.filter(c=>normalize(c.team)===normalize(context.team));
      if(byTeam.length){candidates=byTeam; usedTeamTiebreak=true;}
    }

    return {
      observed,
      status:STATUS.PENDING_HUMAN,
      candidate_status:usedTeamTiebreak?STATUS.TEAM_TIEBREAK:STATUS.CANDIDATES,
      candidates,
      selected:null,
      requires_human:true,
      canonical_for_statistics:false
    };
  }

  function confirmHuman(result,confirmedName,meta={}){
    if(!result||!Array.isArray(result.candidates))throw new Error('Invalid reconciliation result.');
    const selected=result.candidates.find(c=>normalize(c.name)===normalize(confirmedName));
    if(!selected)throw new Error('Human confirmation must select one of the proposed candidates.');
    if(!meta.confirmed_by||!meta.confirmed_at)throw new Error('Human confirmation requires confirmed_by and confirmed_at.');
    return Object.freeze({
      ...result,
      status:STATUS.CANONICAL,
      selected,
      requires_human:false,
      canonical_for_statistics:true,
      human_confirmation:{confirmed_by:meta.confirmed_by,confirmed_at:meta.confirmed_at,note:meta.note||null}
    });
  }

  function assertCanonicalForStatistics(result){
    if(!result||result.canonical_for_statistics!==true)throw new Error('Identity is not canonical for statistics.');
    if(![STATUS.EXACT,STATUS.ALIAS,STATUS.CANONICAL].includes(result.status))throw new Error('Invalid canonical identity status.');
    return true;
  }

  function selfTest(){
    const registry=[
      {name:'Turmalina',team:'Danilo',creci:'1'},
      {name:'Tulio',team:'Wislane',creci:'2'},
      {name:'Sabrina',team:'Wislane',creci:'3'}
    ];
    const exact=reconcile('Sabrina',registry);
    if(!exact.canonical_for_statistics||exact.selected.name!=='Sabrina')throw new Error('Exact match failed.');
    const ambiguous=reconcile('Tuli',registry,{team:'Wislane'},{minSimilarity:0.5});
    if(!ambiguous.requires_human||ambiguous.canonical_for_statistics)throw new Error('Ambiguous match bypassed human gate.');
    const confirmed=confirmHuman(ambiguous,'Tulio',{confirmed_by:'TEST',confirmed_at:'2099-01-01T00:00:00Z'});
    assertCanonicalForStatistics(confirmed);
    const unknown=reconcile('XYZ',registry);
    if(unknown.canonical_for_statistics)throw new Error('Unknown identity became canonical.');
    return {pass:true};
  }

  global.RoletaIdentityReconciliation={
    STATUS,normalize,similarity,buildRegistry,candidateList,reconcile,confirmHuman,assertCanonicalForStatistics,selfTest
  };
  if(typeof module!=='undefined'&&module.exports)module.exports=global.RoletaIdentityReconciliation;
})(typeof globalThis!=='undefined'?globalThis:this);
