import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/eva-4322.js';
import { C4322_FAQ_CANDIDATES } from '../functions/api/_eva4322_candidates.js';

const env={EVA_4322_TENANTS:JSON.stringify({
  t1:{origins:['https://first.example'],name:'EVA Test 1',qa:[{id:'CUST-1',question:'Oferiti servicii sambata?',answer:'Numai cu programare confirmata.',followup:'Doriti sa trimiteti cererea?'}]},
  t2:{origins:['https://second.example'],name:'EVA Test 2',qa:[{id:'CUST-2',question:'Aveti serviciu de weekend?',answer:'Nu avem program de weekend confirmat.'}]}
})};
function req(origin,tenant,message,method='POST'){
 const request=new Request('https://eva.example/api/eva-4322?tenant='+tenant,{method,headers:{Origin:origin,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify({message})}:{})});
 return onRequest({request,env});
}
test('475 standard service/product FAQ candidates and no demo site FAQ',()=>{
 assert.equal(C4322_FAQ_CANDIDATES.length,475);
 assert.ok(C4322_FAQ_CANDIDATES.every(x=>x.reviewStatus==='demo-unverified'));
 assert.ok(C4322_FAQ_CANDIDATES.every(x=>!x.question.includes('C4322B')));
});
test('same KB used by multiple tenant sites',async()=>{
 const a=await (await req('https://first.example','t1','Ce este centrala in condensare?')).json();
 const b=await (await req('https://second.example','t2','Ce este centrala in condensare?')).json();
 assert.equal(a.reply,b.reply);assert.equal(a.kbCount,485);assert.equal(b.kbCount,485);
});
test('tenant overlay isolated',async()=>{
 const a=await (await req('https://first.example','t1','Oferiti servicii sambata?')).json();
 assert.equal(a.reply,'Numai cu programare confirmata.');
 const b=await (await req('https://second.example','t2','Oferiti servicii sambata?')).json();
 assert.notEqual(b.reply,'Numai cu programare confirmata.');
});
test('reject missing and unauthorized tenant origins',async()=>{
 assert.equal((await req('https://attacker.example','t1','test')).status,403);
 assert.equal((await req('https://first.example','unknown','test')).status,403);
});
test('gas emergency always overrides KB',async()=>{
 const result=await (await req('https://first.example','t1','Miroase a gaz in casa')).json();
 assert.equal(result.intent,'siguranta');assert.equal(result.followup,'');
});
test('handles unknown question without fabricated claims',async()=>{
 const result=await (await req('https://first.example','t1','zxqv 987 xyz')).json();
 assert.equal(result.source,'fallback');
});
