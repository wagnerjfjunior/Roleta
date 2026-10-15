'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'gemini-draft-ui.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const start=ui.indexOf('function reviewDateISO('),stop=ui.indexOf('function escapeHtml(',start);
assert.ok(start>=0&&stop>start,'review date helpers must exist');
const date=vm.runInNewContext('(function(){'+ui.slice(start,stop)+'return {reviewDateISO,reviewDateBR};})()');
test('calendar converts BR OCR date to native ISO and back',()=>{
 assert.equal(date.reviewDateISO('09/10/2026'),'2026-10-09');
 assert.equal(date.reviewDateBR('2026-10-09'),'09/10/2026');
 assert.equal(date.reviewDateISO('2026-10-09'),'2026-10-09');
});
test('calendar does not silently guess invalid day/month or year',()=>{
 for(const invalid of ['09.10.26','31/02/2026','29/02/2025','99/10/2026','01/13/2026',''])assert.equal(date.reviewDateISO(invalid),'');
 assert.equal(date.reviewDateISO('29/02/2024'),'2024-02-29');
});
test('date control uses native date picker and supplies BR to canonical bridge',()=>{
 assert.match(ui,/data-review-date type="date"/);
 assert.match(ui,/data:reviewDateBR\(human\.querySelector\('\[data-review-date\]'\)\.value\)/);
});
test('mobile operator review preserves all five controls',()=>{
 for(const attr of ['data-correct-position','data-correct-number','data-correct-name','data-correct-class','data-correct-confirm'])assert.ok(ui.includes(attr));
 assert.match(ui,/data-review-rows/);
 assert.match(ui,/rlt-review-item/);
 assert.match(css,/\.rlt-review-item\{/);
 assert.match(css,/height:44px;min-height:44px/);
});
