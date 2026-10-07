(function(global){
  'use strict';
  async function init(){
    try{
      const model=await global.RoletaDashboardService.load();
      global.RoletaDashboardModel=model;
      global.RoletaDashboardRenderers.renderBase(model);
      await global.RoletaWorkspace.mount(model);
      document.dispatchEvent(new CustomEvent('roleta:workspace-ready',{detail:{events:model.events,modelVersion:model.version}}));
    }catch(err){
      const stamp=document.querySelector('#datasetStamp');
      if(stamp)stamp.textContent='erro de dados';
      document.body.insertAdjacentHTML('beforeend','<div class="error">'+String(err?.message||err)+'</div>');
      throw err;
    }
  }
  init();
})(typeof globalThis!=='undefined'?globalThis:this);
