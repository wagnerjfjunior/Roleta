(function(global){
  'use strict';
  async function load(){
    const response=await fetch('/data/dashboard-view.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Falha ao carregar DTO do dashboard');
    const model=await response.json();
    if(model?.version!=='DASHBOARD-MODEL-V1')throw new Error('Versão incompatível do DTO do dashboard');
    return Object.freeze(model);
  }
  global.RoletaDashboardService={load};
})(typeof globalThis!=='undefined'?globalThis:this);
