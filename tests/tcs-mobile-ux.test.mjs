import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('new visitors see light mode but can preserve dark preference',()=>{
 assert.match(html,/<html lang="ro" data-theme="light">/);
 assert.ok(html.includes('localStorage.getItem("tcs-theme")||"light"'));
});
test('mobile homepage presents prices without the 600px horizontal table',()=>{
 assert.ok(html.includes('.tbl table{display:block;width:100%;min-width:0'));
 assert.ok(html.includes('.tbl tr{display:grid;grid-template-columns:minmax(0,1fr) auto'));
 assert.ok(html.includes('.tbl td.n{color:var(--accent)'));
});
test('mobile Eva button and header are compact and avoid price link overlap',()=>{
 assert.ok(html.includes('#ai-btn{width:56px;height:56px'));
 assert.ok(html.includes('.tbl + p{padding-right:50px'));
 assert.ok(html.includes('.bar{gap:8px;flex-wrap:nowrap'));
});
