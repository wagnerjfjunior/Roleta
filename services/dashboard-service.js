(function(global){
  'use strict';
  const SCHEDULE_EXCEPTIONS={
    '04/10/2026':{mode:'dual',periods:['manha','tarde'],reason:'Eleições Gerais 2026 · 1º turno'},
    '25/10/2026':{mode:'dual',periods:['manha','tarde'],reason:'Eleições Gerais 2026 · eventual 2º turno'}
  };
  const FAMILY=[
    {display_name:'Wagner',ledger_name:'Wagner'},
    {display_name:'Brenda',ledger_name:'Sabrina'},
    {display_name:'Laura',ledger_name:'Laura'},
    {display_name:'Helena',ledger_name:'Helena'}
  ];
  async function fetchText(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar '+path);return r.text()}
  async function fetchJson(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar '+path);return r.json()}
  async function load(){
    const [manifest,weekendPolicy,presence,modelLab,nominalText,officialText,aliasesDoc,transcription06Text]=await Promise.all([
      fetchJson('/data/manifest.json'),fetchJson('/data/weekend-policy.json'),fetchJson('/data/presence-current-week.json'),fetchJson('/data/model-lab.json'),
      fetchText('/data/full_draws_reconstructed.csv'),fetchText('/data/brokers-official.csv'),fetchJson('/data/broker-name-aliases.json'),
      fetchText('/data/transcriptions/2026-10-06.csv')
    ]);
    const groups=await Promise.all((manifest.sources||[]).map(async s=>global.RoletaCSV.parse(await fetchText(s.path))));
    const events=global.RoletaEvents.mergeEventRows(groups);
    const eventModel=global.RoletaEvents.build(events,SCHEDULE_EXCEPTIONS);
    const brokers=global.RoletaBrokers.derive(
      global.RoletaCSV.parse(nominalText),
      global.RoletaCSV.parse(transcription06Text),
      global.RoletaCSV.parse(officialText),
      aliasesDoc.aliases||{},
      events,
      FAMILY
    );
    const weekend=global.RoletaWeekend.resolve(weekendPolicy,presence);
    return Object.freeze({
      version:'DASHBOARD-MODEL-V1',
      generated_from:{manifest:manifest.logical_dataset_version,broker_identity_gate:'IDENTITY-V1.0.0'},
      events,
      eventModel,
      brokers,
      weekend,
      weekendPolicy,
      presence,
      modelLab
    });
  }
  global.RoletaDashboardService={load};
})(typeof globalThis!=='undefined'?globalThis:this);
