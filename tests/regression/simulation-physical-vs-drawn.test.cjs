'use strict';
// Regression: original physical location != drawn ball != final service order.
// Synthetic cases; never touch canonical data, production or any SQL endpoint.
const test=require('node:test');
const assert=require('node:assert/strict');
require('../../domain/core.js');
require('../../simulation/engine.js');
const engine=globalThis.RoletaSimulationEngine;
const domain=globalThis.RoletaDomainCore;

function swapFirstAndLastRng(){
 // Fisher-Yates: first iteration swaps ball N with ball 1, then keeps all
 // other slots unchanged; yields [N,2,3,...,N-1,1].
 let draws=0;
 return ()=>draws++===0?0:0.999999999;
}

test('Wagner on physical row 1 draws ball 10; physical row 10 draws ball 1',()=>{
 const t={N:10,period:'manha',occupied:[1,2,3,4,5,6,7,8,9,10]};
 const e=engine.simulateEvent(t,swapFirstAndLastRng(),1);
 assert.equal(e.permutation[0],10); // Wagner's drawn ball and final order
 assert.equal(e.permutation[9],1); // other broker's drawn ball and final order
 assert.equal(e.last,1); // physical row of the broker who drew last ball
 assert.equal(e.first,10); // physical row of the broker who drew ball 1
 assert.equal(e.second,2);
 assert.equal(domain.hit2x(e,10),true); // physical 10 won ball 1
 assert.equal(domain.hit2x(e,1),true); // physical 1 won ball 10 (last)
 assert.deepEqual(e.occupied,t.occupied);
});

test('physical rows with gaps remain original labels, drawn balls remain 1..N',()=>{
 const t={N:4,period:'tarde',occupied:[1,2,4,10]};
 const templates=engine.completeTemplates([t]);
 assert.equal(templates.length,1);
 assert.deepEqual(templates[0].occupied,[1,2,4,10]);
 const e=engine.simulateEvent(templates[0],swapFirstAndLastRng(),2);
 assert.deepEqual(e.permutation,[4,2,3,1]);
 assert.deepEqual(e.occupied,[1,2,4,10]);
 assert.equal(e.first,10);
 assert.equal(e.last,1);
 assert.equal(e.second,2);
 assert.equal(e.courtesy,4);
 assert.equal(domain.eligible(e,3),false); // nonexistent physical row
});

test('engine self-test maintains permutation and physical occupancy separation',()=>{
 const e={N:10,period:'manha',occupied:[1,2,3,4,5,6,7,8,9,10],first:10,last:1};
 assert.equal(engine.selfTest([e]).pass,true);
 const base=domain.scoreRows([e]);
 assert.equal(base.find(x=>x.pos===10).hits,1);
 assert.equal(base.find(x=>x.pos===1).hits,1);
 assert.equal(base.find(x=>x.pos===5).hits,0);
});

test('historical CSV explicitly distinguishes Nº1 physical from effective position',()=>{
 const fs=require('node:fs');
 const csv=fs.readFileSync(require('node:path').join(__dirname,'../../data/events.csv'),'utf8');
 const header=csv.split(/\r?\n/,1)[0];
 assert.match(header,/Nº1 físico,Nº1 ordem efetiva/);
 assert.match(header,/Nº2 físico,Nº2 ordem efetiva/);
 assert.match(header,/Último físico,Último ordem efetiva/);
 // Known historical exception with vacant/risked lines: physical 17, effective 16.
 assert.match(csv,/P02,01\/09\/2025,desconhecido,17,[^\r\n]*,17,16,11,11/);
});
