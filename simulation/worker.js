importScripts('/simulation/engine.js');

self.onmessage=function(event){
  const msg=event.data||{};
  if(msg.type!=='run')return;
  try{
    const result=self.RoletaSimulationEngine.run({
      ...msg.config,
      onProgress:(done,total)=>{
        self.postMessage({type:'progress',done,total,pct:total?done/total:0});
      }
    });
    self.postMessage({type:'complete',result});
  }catch(error){
    self.postMessage({type:'error',message:error&&error.message?error.message:String(error)});
  }
};
