'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {computeChainedEnvelopeHash}=require('../../simulation/prospective-integrity.cjs');
const sha='b'.repeat(64), prev='a'.repeat(64);
const vectors=[
 ['genesis',null,sha,'2026-10-10T16:00:00.000Z','google:ci-user'],
 ['chained',prev,sha,'2026-10-10T16:00:00.123Z','google:ci-user'],
 ['unicode',prev,sha,'2026-10-10T16:00:00.999Z','google:São Paulo 🎯'],
 ['escaping',prev,sha,'2026-10-10T16:00:00.001Z','google:quote"slash\\tab\t'],
 ['edge-time',prev,sha,'2026-10-10T23:59:59.999Z','google:ci']
];
const lines=vectors.map(([id,previousHash,requestSha256,receivedAt,actorSubject])=>{
 const hash=computeChainedEnvelopeHash({previousHash,requestSha256,receivedAt,actorSubject});
 const values=[id,previousHash??'\\N',requestSha256,receivedAt,actorSubject,hash];
 if(values.some(v=>/[\t\r\n]/.test(v)))throw new Error('unsafe TSV value');
 return values.join('\t');
});
fs.writeFileSync(path.join(__dirname,'envelope-hash-vectors.tsv'),lines.join('\n')+'\n');
