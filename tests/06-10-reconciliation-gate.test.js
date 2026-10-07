const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'data','manifest.json'),'utf8'));
const adjudications=fs.readFileSync(path.join(root,'data','prospective','adjudications.jsonl'),'utf8');

assert.strictEqual(manifest.canonical_event_count,85);
assert.strictEqual(manifest.quality_A,81);
assert.strictEqual(manifest.quality_B,4);
assert.ok(!manifest.sources.some(s=>s.path==='/data/incoming/2026-10-06.csv'));
assert.ok(Array.isArray(manifest.pending_reconciliation));
assert.ok(manifest.pending_reconciliation.some(x=>x.event==='06-10-M'&&x.status==='PENDING_RLT_RECONCILIATION_V2'));
assert.ok(fs.existsSync(path.join(root,'data','incoming','2026-10-06.csv')),'06/10 source evidence must be preserved');
assert.ok(!adjudications.includes('"target_event_id":"2026-10-06-manha"'),'06/10 morning must not be adjudicated before reconciliation confirmation');
assert.ok(adjudications.includes('"target_event_id":"2026-10-05-manha"'),'05/10 morning closure must remain');
assert.ok(adjudications.includes('"target_event_id":"2026-10-05-tarde"'),'05/10 afternoon closure must remain');

console.log('PASS 06-10 gate: evidence preserved, canonical/statistical ingestion blocked, 05-10 untouched.');
