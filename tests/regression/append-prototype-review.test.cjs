'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../../database/review-only/20261010_append_prospective_evidence_prototype.sql'),'utf8');
test('F2-11 append prototype locks chain, rejects conflicting replay and remains ungranted',()=>{
 for(const p of [/REVIEW ONLY/i,/pg_advisory_xact_lock/,/idempotency key conflict/,/event closed/,/outcome without prediction/,/SECURITY INVOKER/,/clock_timestamp\(\)/])assert.match(sql,p);
 assert.match(sql,/REVOKE ALL ON FUNCTION roleta_audit\.append_prospective_evidence_review\(text,text,text,text,text,jsonb,text\) FROM PUBLIC, anon, authenticated;/);
 assert.doesNotMatch(sql,/\bGRANT\s+EXECUTE\b/i);
 assert.doesNotMatch(sql,/LANGUAGE\s+plpgsql\s+SECURITY\s+DEFINER/i);
});
