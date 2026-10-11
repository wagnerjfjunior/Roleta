(function(global){
  'use strict';
  // Canonical statistical loader. This is READ ONLY and never registers a
  // roulette, prints a PDF or writes prospectively. Imports are git-reviewed.
  function fingerprint(e){
    return JSON.stringify([
      e.id,e.date,e.period,e.N,e.occupied,e.first,e.second,
      e.courtesy,e.last,e.quality,e.source,e.notes
    ]);
  }
  function mergeManifestEvents(chunks,manifest){
    if(!manifest||!Array.isArray(manifest.sources)||!Array.isArray(chunks)||
       chunks.length!==manifest.sources.length)
      throw Error('Manifesto estatístico incompleto.');
    const byId=new Map();
    for(let i=0;i<chunks.length;i++){
      const source=manifest.sources[i];
      const rows=chunks[i];
      if(!source||typeof source.path!=='string'||!Array.isArray(rows))
        throw Error('Fonte do manifesto estatístico inválida.');
      if(!Number.isSafeInteger(source.events)||source.events!==rows.length)
        throw Error('Contagem inconsistente na fonte estatística '+source.path+'.');
      for(const event of rows){
        const id=event?.id;
        if(typeof id!=='string'||!id.trim())
          throw Error('Evento sem identificador na fonte '+source.path+'.');
        if(!Number.isSafeInteger(event.N)||event.N<1)
          throw Error('N inválido no evento '+id+'.');
        if(!Array.isArray(event.occupied)||event.occupied.length!==event.N||
           event.occupied.some(pos=>!Number.isSafeInteger(pos)||pos<1)||
           new Set(event.occupied).size!==event.N)
          throw Error('Posições físicas inválidas no evento '+id+'.');
        const previous=byId.get(id);
        if(previous){
          // A perfectly identical replay is idempotent. No silent overwrite
          // of divergent corrections: they require explicit review/versioning.
          if(fingerprint(previous)!==fingerprint(event))
            throw Error('Conflito de versões do evento '+id+'. Revisão manual obrigatória.');
          continue;
        }
        byId.set(id,event);
      }
    }
    const events=[...byId.values()];
    if(!Number.isSafeInteger(manifest.canonical_event_count)||
       manifest.canonical_event_count!==events.length)
      throw Error('Total da base estatística diverge do manifesto.');
    if(Number.isSafeInteger(manifest.quality_A)&&
       manifest.quality_A!==events.filter(e=>e.quality==='A').length)
      throw Error('Total de qualidade A diverge do manifesto.');
    if(Number.isSafeInteger(manifest.quality_B)&&
       manifest.quality_B!==events.filter(e=>e.quality==='B').length)
      throw Error('Total de qualidade B diverge do manifesto.');
    return events;
  }
  const api={mergeManifestEvents};
  global.RoletaCanonicalDataset=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
