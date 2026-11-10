import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/oferta.html',import.meta.url),'utf8');
test('all offer prices remain present in original semantic table',()=>{
 assert.ok((html.match(/<tr/g)||[]).length >= 70);
 for(const x of ['Traseu frigorific suplimentar','130 lei','Console, cablu și găuri suplimentare','80 lei','Încălzire','Piață București'])assert.ok(html.includes(x),x);
});
test('mobile offer cards show all four table fields and disable 600px minimum width',()=>{
 assert.ok(html.includes('@media(max-width:760px)'));
 assert.ok(html.includes('.tbl table{display:block;width:100%;min-width:0'));
 assert.ok(html.includes('.tbl thead{display:none}'));
 assert.ok(html.includes('td:nth-child(3)::before{content:"Preț TCS INSTAL"'));
 assert.ok(html.includes('td:nth-child(4)::before{content:"Piață București"'));
 assert.ok(html.includes('td:nth-child(2){grid-column:1/-1'));
 assert.ok(html.includes('tr.grp td{display:block'));
});
test('mobile floating EVA not 70px oversized and new visitor theme is light',()=>{
 assert.ok(html.includes('#ai-btn{width:56px;height:56px'));
 assert.ok(html.includes('localStorage.getItem("tcs-theme")||"light"'));
});
