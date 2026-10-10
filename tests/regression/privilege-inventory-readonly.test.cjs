'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../../database/audit-only/20261010_shared_db_privilege_inventory.sql'),'utf8');
test('F2-11 privilege inventory contains only SELECT statements',()=>{
 const withoutComments=sql.split('\n').filter(x=>!x.trim().startsWith('--')).join('\n');
 const statements=withoutComments.split(';').map(x=>x.trim()).filter(Boolean);
 assert.equal(statements.length,5);
 for(const statement of statements){
  assert.match(statement,/^SELECT\b/i);
  assert.doesNotMatch(statement,/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|GRANT|REVOKE|TRUNCATE|EXECUTE|CALL|DO)\b/i);
 }
 assert.match(sql,/pg_catalog\.pg_default_acl/);
 assert.match(sql,/pg_catalog\.pg_roles/);
 assert.match(sql,/pg_catalog\.pg_proc/);
});
