'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {canonical}=require('../../simulation/prospective-intent.cjs');
const cases=[
 ['empty',{z:0,a:null}],
 ['unicode',{emoji:'🎯',name:'São Paulo',combining:'e\u0301'}],
 ['numeric',{minus:-0,decimal:0.125,exponent:1e-7,large:9007199254740991}],
 ['nested',{b:[true,false,null,{z:'last',a:'first'}],a:{x:[1,2,3]}}],
 ['escaped',{quote:'"',slash:'\\',newline:'line1\nline2',tab:'a\tb'}],
 ['envelope',{version:'rlt-evidence-envelope-v1',previous_hash:null,request_sha256:'a'.repeat(64),received_at:'2026-10-10T16:00:00.000Z',actor_subject:'ci-test'}],
 ['intent',{event_id:'2026-10-10-M',kind:'prediction',policy:'WEEKLY_FROZEN',payload:{N:12},idempotency_key:'ci-test-key-00000001'}]
];
const output=cases.map(([id,value])=>{
 const bytes=canonical(value);
 if(/[\t\r\n\b]/.test(bytes))throw new Error('unexpected raw control byte');
 return [id,bytes,crypto.createHash('sha256').update(bytes,'utf8').digest('hex')].join('\t');
}).join('\n')+'\n';
fs.writeFileSync(path.join(__dirname,'hash-vectors.tsv'),output,'utf8');
