'use strict';
// Real event guard: reject post-draw/backdated requests regardless of client data.
// Only weekday time slots with confirmed closing times are enabled here.
// Weekend/integral requires a separately reviewed cutoff before writes.
const ID=/^(\d{4}-\d{2}-\d{2})-(manha|tarde|integral)$/;
const MAX_CLOCK_SKEW_MS=5*60*1000;
function assertPreDraw(command,{now=()=>Date.now()}={}){
 const data=JSON.parse(command.params[8]);
 const eventId=command.params[3];
 const m=ID.exec(eventId||'');
 if(!m||m[2]==='integral')throw Error('unsupported target event cutoff');
 const date=m[1],time=m[2]==='manha'?'08:46':'13:46';
 if(!/^2026-/.test(date))throw Error('unconfigured operational calendar');
 const cutoff=Date.parse(date+'T'+time+':00-03:00');
 if(!Number.isFinite(cutoff)||date!==new Date(cutoff-3*3600000).toISOString().slice(0,10))
  throw Error('invalid target event date');
 const current=now(),generated=Date.parse(data.generated_at),frozen=data.frozen_at?Date.parse(data.frozen_at):null;
 if(current>=cutoff||generated>=cutoff||(frozen!==null&&(!Number.isFinite(frozen)||frozen>=cutoff)))
  throw Error('target roulette already closed');
 if(!Number.isFinite(current)||!Number.isFinite(generated)
    ||generated>current+MAX_CLOCK_SKEW_MS||generated<current-MAX_CLOCK_SKEW_MS)
  throw Error('prediction generation must be server-current');
 // Does not prove an eligible physical line; independent trusted roster required.
 return {event_id:eventId,cutoff};
}
module.exports={assertPreDraw};
