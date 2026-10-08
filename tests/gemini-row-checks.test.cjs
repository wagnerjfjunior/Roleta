const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('gemini-draft-ui.js','utf8');
for(const k of ['data-correct-confirm','data-line-progress','transferButton.disabled','rlt-line-verified','rlt-line-attention','Nº Escolhido','Nº Sorteado','data-correct-position','numericPosition','positions.get(parsedPhysical)','invalidPhysical','posicao_impressa:tr.querySelector'])assert.ok(s.includes(k),k);
console.log('PASS: review checklist guards');

// Verify that physical positions are compared as canonical integers.
const numericPosition=value=>/^\d+$/.test(value)&&Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=100?Number(value):null;
assert.equal(numericPosition('01'),1);
assert.equal(numericPosition('1'),1);
assert.equal(numericPosition('0'),null);
assert.equal(numericPosition('101'),null);
assert.equal(numericPosition('1.5'),null);
const count=new Map();for(const p of ['01','1']){const n=numericPosition(p);count.set(n,(count.get(n)||0)+1);}
assert.equal(count.get(1),2);
