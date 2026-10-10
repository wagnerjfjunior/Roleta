importScripts('/domain/core.js');
importScripts('/simulation/weekly-duel.js');

self.onmessage=function(event){
  const msg=event.data||{};
  if(msg.type!=='run'&&msg.type!=='multiseed')return;
  try{
    const execute=msg.type==='multiseed'?self.RoletaWeeklyDuel.runMultiseed:self.RoletaWeeklyDuel.run;
    const result=execute({
      ...msg.config,
      onProgress:progress=>self.postMessage({type:'progress',...progress})
    });
    self.postMessage({type:'complete',result});
  }catch(error){
    self.postMessage({type:'error',message:error&&error.message?error.message:String(error)});
  }
};
