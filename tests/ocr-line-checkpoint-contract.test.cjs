'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ocr=fs.readFileSync('gemini-draft-ui.js','utf8');
const review=fs.readFileSync('roulette-intake.js','utf8');

test('same IndexedDB version and private local checkpoint store in both mounts',()=>{
  for(const source of [ocr,review]){
    assert.match(source,/indexedDB\.open\('roleta-ocr-evidence',3\)/);
    assert.match(source,/objectStoreNames\.contains\('line-checkpoints'\)/);
  }
  assert.match(ocr,/db\.transaction\('line-checkpoints',mode\)/);
});

test('line edits and confirmation checks checkpoint without new HTTP paths',()=>{
  assert.match(ocr,/human\.addEventListener\('input',checkpointLines\)/);
  assert.match(ocr,/human\.addEventListener\('change',checkpointLines\)/);
  assert.match(ocr,/\[data-correct-confirm\]/);
  assert.match(ocr,/checkpointWrites=checkpointWrites\.catch/);
  assert.match(ocr,/account:googleSession\.email\.toLowerCase\(\)/);
  assert.match(ocr,/await restoreLines\(id\)/);
  assert.match(ocr,/row\.querySelector\('\[data-correct-confirm\]'\)\.checked=stored\.checked===true/);
});

test('checkpoint is cleared only in evidence disposal after server-side final save',()=>{
  assert.match(ocr,/host\.addEventListener\('roleta-final-saved'/);
  assert.match(ocr,/checkpointTxn\('readwrite',store=>store\.delete\(id\)\)/);
  assert.doesNotMatch(ocr,/host\.addEventListener\('roleta-final-confirmed',\(\)=>\{if\(!shadowConsent\.checked\)discardEvidence/);
  assert.match(review,/\['saved','replayed'\]\.includes\(event\.detail\?\.status\)/);
});
