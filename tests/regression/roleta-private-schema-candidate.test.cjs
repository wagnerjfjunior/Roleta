'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../../database/review-only/20261010_roleta_private_ledger_candidate.sql'),'utf8');
test('F2-11 migration candidate is private, fail closed and review only',()=>{
 for(const pattern of [/REVIEW ONLY/i,/CREATE SCHEMA roleta_audit;/,/ENABLE ROW LEVEL SECURITY/,/FORCE ROW LEVEL SECURITY/,/REVOKE ALL ON SCHEMA roleta_audit FROM PUBLIC/,/REVOKE ALL ON ALL TABLES IN SCHEMA roleta_audit FROM PUBLIC, anon, authenticated/,/idempotency_key text NOT NULL UNIQUE/,/CREATE UNIQUE INDEX prospective_prediction_once/,/CREATE UNIQUE INDEX prospective_outcome_once/])assert.match(sql,pattern);
 assert.doesNotMatch(sql,/\bGRANT\s+(?:ALL|SELECT|INSERT|EXECUTE)\b/i);
 assert.doesNotMatch(sql,/\bDROP\s+(?:SCHEMA|TABLE)\b/i);
 assert.doesNotMatch(sql,/\bALTER\s+TABLE\s+(?:public|auth|forensic_evidence)\./i);
});
