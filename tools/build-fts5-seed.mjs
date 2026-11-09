#!/usr/bin/env node
/* Builds deterministic D1 SQL seed files from the versioned Eva KNOWLEDGE.
   No remote access. Run schema first, then apply the numbered chunks in order.
   The final chunk writes k_hash only after all rows are imported. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { KNOWLEDGE as BASE_KNOWLEDGE } from '../functions/api/_knowledge.js';
import { FAQ_SYNC_LINES } from '../functions/api/_faq_sync.js';
const KNOWLEDGE = BASE_KNOWLEDGE + (FAQ_SYNC_LINES.length ? '\n' + FAQ_SYNC_LINES.join('\n') : '');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'dist','eva-fts5');
fs.mkdirSync(target,{recursive:true});
for(const f of fs.readdirSync(target))if(/^chunk-\d+\.sql$/.test(f))fs.unlinkSync(path.join(target,f));
const rows=KNOWLEDGE.split('\n');
const hash=createHash('sha256').update(KNOWLEDGE).digest('hex').slice(0,16);
const esc=s=>"'"+String(s).replaceAll("'","''")+"'";
const batchSize=35;
const statements=["DELETE FROM meta WHERE key='k_hash';",'DELETE FROM k;'];
for(const line of rows){
 const m=line.match(/Întrebare: (.*?) Răspuns:/);
 statements.push('INSERT INTO k(q,body) VALUES('+esc(m?m[1]:'')+','+esc(line)+');');
}
statements.push('INSERT OR REPLACE INTO meta(key,val) VALUES(\'k_hash\','+esc(hash)+');');
let count=0;
for(let i=0;i<statements.length;i+=batchSize){
 const chunk=statements.slice(i,i+batchSize);
 const file='chunk-'+String(++count).padStart(3,'0')+'.sql';
 fs.writeFileSync(path.join(target,file),chunk.join('\n')+'\n','utf8');
}
const manifest={rows:rows.length,hash,chunks:count,generatedAt:new Date().toISOString()};
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared local FTS5 load:',JSON.stringify(manifest));
console.log('Run migration first. Import chunk SQL files in ascending order. Do not send customer prompts to a third party.');
