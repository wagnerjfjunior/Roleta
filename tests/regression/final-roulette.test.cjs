'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {prepareFinal}=require('../../server/final-roulette-contract.cjs');
const {createHandler}=require('../../api/final-roulette.js');
const {mergeFinal}=require('../../domain/final-ledger.js');
const brokers=require('../../data/print-brokers.json').brokers.filter(b=>b.creci&&b.cargo.includes('salão')).slice(0,5);
function input(){return {acknowledged:true,source:'IMG_test.jpeg',physicalByDraw:[10,3,5,8],reviewed:{status:'VALIDADO',evento:{data:'11/10/2026',periodo:'INTEGRAL',empreendimento:'CAMINHOS DA LAPA',dia_semana:'DOMINGO',tegra_qtd:4,helbor_qtd:0,company_draw:{mode:'tegra_share',tegra_positions:[1,2],helbor_positions:[3]}},salao:brokers.slice(0,4).map((b,i)=>({nome:b.nome,creci:b.creci,gerente:b.gerente,diretor:b.diretor,status_creci:b.status_creci,ordem_final:i+1})),standby:[brokers[4]],online:[]}};}
const prepare=x=>prepareFinal(x,{actorSub:'real-google-sub',now:new Date('2026-10-12T20:00:00Z')});
test('final contract preserves complete physical mapping and other classes; D+1 accepted',()=>{const c=prepare(input()),p=JSON.parse(c.text);assert.equal(p.event.first,10);assert.equal(p.event.last,8);assert.equal(p.reviewed.standby.length,1);assert.equal(p.event.N,4);assert.equal(c.actorSub,'real-google-sub');assert.equal(c.expectedVersion,0);assert.match(c.digest,/^[a-f0-9]{64}$/);});
test('stable digest ignores client property order and excludes forged actor',()=>{const x=input(),c=prepare(x);x.actorSub='forged';x.reviewed.extra='junk';assert.equal(prepare(x).digest,c.digest);});
test('requires exact operator confirmation',()=>{const x=input();x.acknowledged='true';assert.throws(()=>prepare(x));});
test('rejects duplicated broker across classes',()=>{const x=input();x.online=[x.reviewed.salao[0]];x.reviewed.online=x.online;assert.throws(()=>prepare(x));});
test('rejects tampered official metadata',()=>{const x=input();x.reviewed.standby[0]={...x.reviewed.standby[0],gerente:'Fake'};assert.throws(()=>prepare(x));});
test('validates supplied correction reason and integer predecessor; DB enforces reason on changes',()=>{const x=input();x.expectedVersion=1;assert.match(prepare(x).reason,/validada pelo operador/);x.reason='curto';assert.throws(()=>prepare(x));x.reason='Correção da linha física conferida';assert.equal(prepare(x).expectedVersion,1);x.expectedVersion='1';assert.throws(()=>prepare(x));});
test('rejects future outcomes and baseline events',()=>{const x=input();x.reviewed.evento.data='13/10/2026';assert.throws(()=>prepare(x));x.reviewed.evento.data='05/10/2026';x.reviewed.evento.periodo='MANHÃ';assert.throws(()=>prepare(x),e=>e.status===409);});
test('invalid company draw blocked',()=>{const x=input();x.reviewed.evento.company_draw.helbor_positions=[2];assert.throws(()=>prepare(x));});
const authenticate={session:()=>({sub:'real-google-sub',email:'wagnerjfjunior@gmail.com'}),csrfForSub:()=> 'csrf',requireSameOrigin:()=>true};
function res(){return {code:null,body:null,setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};}
const env={ROLETA_FINAL_WRITES_ENABLED:'true',ROLETA_FINAL_READS_ENABLED:'true',ROLETA_FINAL_OPERATOR_EMAILS:'wagnerjfjunior@gmail.com'};
const req=()=>({method:'POST',headers:{'content-type':'application/json','x-roleta-csrf':'csrf'},body:input()});
test('disabled flag denies before auth/database',async()=>{let calls=0;const r=res();await createHandler({env:{},authenticate:{session(){calls++}},save(){calls++}})(req(),r);assert.equal(r.code,503);assert.equal(calls,0);});
test('rejects unknown operator before persistence',async()=>{let calls=0;const r=res();await createHandler({env:{...env,ROLETA_FINAL_OPERATOR_EMAILS:'other@example.com'},authenticate,save(){calls++}})(req(),r);assert.equal(r.code,403);assert.equal(calls,0);});
test('CSRF and origin refusal never save',async()=>{for(const a of [{...authenticate,requireSameOrigin:()=>false},{...authenticate,csrfForSub:()=> 'wrong'}]){let calls=0;const r=res();await createHandler({env,authenticate:a,authorize:async()=>{},save(){calls++}})(req(),r);assert.equal(r.code,403);assert.equal(calls,0);}});
test('server uses signed subject and returns saved version',async()=>{let calls=0;const request=req();request.body.actorSub='forged';const r=res();await createHandler({env,authenticate,authorize:async()=>{},prepare:x=>prepare(x),save:async c=>{calls++;assert.equal(c.actorSub,'real-google-sub');return {status:'saved',event_id:c.eventId,version:1,current_version:1};}})(request,r);assert.equal(r.code,200);assert.equal(calls,1);});
test('database conflict sanitized; secrets never reflected',async()=>{const r=res();await createHandler({env,authenticate,authorize:async()=>{},prepare,save:async()=>{throw Object.assign(Error('postgres://secret'),{code:'40001'})}})(req(),r);assert.equal(r.code,409);assert.ok(!JSON.stringify(r.body).includes('postgres'));});
test('read requires operator and no write or CSRF; no cookie means denied',async()=>{const r=res();await createHandler({env,authenticate,authorize:async()=>{},read:async()=>[]})({method:'GET'},r);assert.equal(r.code,200);const denied=res();await createHandler({env,authenticate:{session:()=>null}})({method:'GET'},denied);assert.equal(denied.code,401);});
test('dashboard includes one current version and complete nominal records',()=>{const c=prepare(input()),record={event_id:c.eventId,version:2,payload:JSON.parse(c.text)};const result=mergeFinal([], [record]);assert.equal(result.events.length,1);assert.equal(result.nominal.length,4);assert.equal(result.events[0].first,10);assert.equal(result.events[0].version,2);assert.throws(()=>mergeFinal(result.events,[record]));});
test('dashboard rejects corrupt mapping instead of silently changing statistics',()=>{const c=prepare(input()),record={event_id:c.eventId,version:1,payload:JSON.parse(c.text)};record.payload.event.first=1;assert.throws(()=>mergeFinal([],[record]));});
test('final sheet alone saves without filename or invented physical positions',()=>{
 const x=input();delete x.source;delete x.physicalByDraw;
 const c=prepare(x),payload=JSON.parse(c.text);
 assert.equal(payload.event.physical_mapping_complete,false);
 assert.deepEqual(payload.event.occupied,[]);assert.equal(payload.event.first,null);
 assert.ok(payload.event.drawn_mapping.every(m=>m.physical_position===null));
 const result=mergeFinal([],[{event_id:c.eventId,version:1,payload}]);
 assert.equal(result.events.length,0);assert.equal(result.nominal.length,4);assert.deepEqual(result.unmapped,[c.eventId]);
});
test('physical positions already reviewed in OCR remain paired with the broker and final draw',()=>{
 const x=input();delete x.physicalByDraw;delete x.source;
 x.reviewed.salao.forEach((r,i)=>r.physical_position=[10,3,5,8][i]);
 const e=JSON.parse(prepare(x).text).event;assert.equal(e.first,10);assert.equal(e.last,8);
 assert.equal(e.physical_mapping_complete,undefined);
 x.reviewed.salao[1].physical_position=10;assert.throws(()=>prepare(x));
});
test('partial physical data does not become a complete positional event',()=>{
 const x=input();delete x.physicalByDraw;x.reviewed.salao[0].physical_position=10;
 const c=prepare(x),payload=JSON.parse(c.text);
 assert.deepEqual(payload.event.occupied,[10]);assert.equal(payload.event.first,10);assert.equal(payload.event.last,null);
 assert.equal(mergeFinal([],[{event_id:c.eventId,version:1,payload}]).events.length,0);
 delete payload.event.physical_mapping_complete;assert.throws(()=>mergeFinal([],[{event_id:c.eventId,version:1,payload}]));
});
test('canonical human correction keeps original physical positions when final order changes',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),context={window:{RoletaIntakeNormalization:require('../../intake-normalization.js')}};
 vm.runInNewContext(fs.readFileSync('roulette-intake.js','utf8'),context);
 const x=input(),positions=[10,3,5,8];
 const elements=x.reviewed.salao.map((r,i)=>({
  dataset:{originalPosition:String(i+1),originalName:r.nome,physicalPosition:String(positions[i])},
  querySelector(selector){return {value:selector==='.rltv2-review-name'?r.nome:String(i===0?2:i===1?1:i+1)};}
 }));
 const host={querySelectorAll:selector=>selector.includes('"salao"')?elements:[]};
 const result=context.window.RouletteIntake.applyHumanReview({...x.reviewed,standby:[]},host,brokers);
 assert.equal(result.errors.length,0);
 assert.equal(result.payload.salao[0].nome,x.reviewed.salao[1].nome);
 assert.equal(result.payload.salao[0].physical_position,3);
 const text=fs.readFileSync('roulette-intake.js','utf8');
 assert.doesNotMatch(text,/5 · AMOSTRAGEM|rltStatSource|rltStatConfirm|rlt-stat-physical|rltStatReason/);
 assert.ok(text.indexOf('id="rltStatSubmit"')>text.indexOf('3 · PRÉVIA FINAL'));
});
