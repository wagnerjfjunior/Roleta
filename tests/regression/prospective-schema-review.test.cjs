'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../../database/review-only/20261010_roleta_audit_schema.sql'),'utf8');
test('F2-11 draft SQL never grants access to browser JWT roles',()=>{
 assert.match(sql,/CREATE SCHEMA IF NOT EXISTS roleta_audit/);
 assert.match(sql,/REVOKE ALL ON SCHEMA roleta_audit FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/FORCE ROW LEVEL SECURITY/);
 assert.doesNotMatch(sql,/GRANT\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE|EXECUTE)[\s\S]{0,100}\sTO\s+(?:anon|authenticated)\b/i);
});
test('F2-11 draft SQL includes duplicate prevention and immutable-only intent',()=>{
 assert.match(sql,/CREATE UNIQUE INDEX evidence_prediction_once/);
 assert.match(sql,/CREATE UNIQUE INDEX evidence_outcome_once/);
 assert.match(sql,/REVIEW ONLY/);
 assert.doesNotMatch(sql,/DROP SCHEMA/i);
});
