// Regression tests: Eva hybrid RRF ranking and fallback contract.
// Run: node --test tests/eva-hybrid.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../functions/api/chat.js',import.meta.url),'utf8');
const start=code.indexOf('function hybrid(');
const end=code.indexOf('const FALLBACK=',start);
assert.ok(start>=0&&end>start);
const hybrid=new Function(code.slice(start,end)+'\nreturn hybrid;')();
test('RRF boosts results found in both engines',()=>{
 const actual=hybrid(['B','A','C'],['A','B','D'],4);
 assert.deepEqual(actual.slice(0,2),['A','B']);
});
test('RRF deduplicates and limits results',()=>{
 assert.deepEqual(hybrid(['A','B'],['B','C'],3),['B','A','C']);
});
test('RRF works with only one ranking',()=>{
 assert.deepEqual(hybrid(null,['first','second'],2),['first','second']);
});
test('source uses hybrid as default and IDF as fallback',()=>{
 assert.match(code,/const engine=ftsTop&&ftsTop\.length\?"hybrid":"idf"/);
 assert.match(code,/SEARCH_ENGINE/);
 assert.match(code,/FTS_AB_LOG/);
 assert.doesNotMatch(code,/db\.batch\(/);
});
