const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('gemini-draft-ui.js','utf8');
for(const k of ['data-correct-confirm','data-line-progress','transferButton.disabled','rlt-line-verified','rlt-line-attention','Nº Escolhido','Nº Sorteado'])assert.ok(s.includes(k),k);
console.log('PASS: review checklist guards');
