import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {onRequest as admin} from '../functions/api/eva-4322-admin.js';
import {onRequest as chat} from '../functions/api/eva-4322.js';
import {readFileSync} from 'node:fs';
const pass='very-long-pilot-secret-token-000001';
const hash=createHash('sha256').update(pass).digest('hex');
const store=new Map();
const db={
 prepare(sql){
  let args=[];
  return {
   bind(...a){args=a;return this},
   async all(){
    if(sql.includes('WHERE tenant_id=? AND status=')){
     return {results:[...store.values()].filter(x=>x.tenant_id===args[0]&&x.status==='published').map(x=>({id:x.qa_id,question:x.question,answer:x.answer,followup:x.followup}))};
    }
    if(sql.includes('ORDER BY updated_at DESC')){
     return {results:[...store.values()].filter(x=>x.tenant_id===args[0]).map(x=>({id:x.qa_id,question:x.question,answer:x.answer,followup:x.followup,status:x.status}))};
    }
    throw Error('unexpected all SQL');
   },
   async run(){
    if(sql.startsWith('INSERT')){
     const [tenant_id,qa_id,question,answer,followup]=args;
     store.set(tenant_id+':'+qa_id,{tenant_id,qa_id,question,answer,followup,status:'draft'});
     return {meta:{changes:1}};
    }
    if(sql.startsWith('UPDATE')){
     const [status,tenant_id,qa_id]=args,key=tenant_id+':'+qa_id;
     const old=store.get(key);if(old)store.set(key,{...old,status});
     return {meta:{changes:old?1:0}};
    }
    throw Error('unexpected run SQL');
   }
  };
 }
};
const env={EVA_DB:db,EVA_4322_TENANTS:JSON.stringify({t1:{origins:['https://first.example']},t2:{origins:['https://second.example']}}),EVA_4322_ADMIN_SHA256:JSON.stringify({t1:hash,t2:hash})};
const call=(tenant,method='GET',body,token=pass,origin='https://eva.example')=>admin({
 env,request:new Request('https://eva.example/api/eva-4322-admin?tenant='+tenant,{
 method,headers:{...(token?{Authorization:'Bearer '+token}:{}),Origin:origin,'Content-Type':'application/json'},
 ...(body?{body:JSON.stringify(body)}:{})
 })
});
test('admin requires token and same-origin',async()=>{
 assert.equal((await call('t1','GET',null,'')).status,401);
 assert.equal((await call('t1','GET',null,'wrong-secret')).status,401);
 assert.equal((await call('t1','GET',null,'long-enough-but-incorrect-token')).status,403);
 assert.equal((await call('t1','GET',null,pass,'https://attacker.example')).status,403);
});
test('draft is not visible to visitors; publication toggles visibility; tenants isolated',async()=>{
 const draft={action:'save',id:'T1-001',question:'Tarif special montaj local?',answer:'Tariful confirmat se comunică la ofertare.',followup:'Doriți un deviz?'};
 assert.equal((await call('t1','POST',draft)).status,200);
 const publicRequest=tenant=>chat({env,request:new Request('https://eva.example/api/eva-4322?tenant='+tenant,{method:'POST',headers:{Origin:tenant==='t1'?'https://first.example':'https://second.example'},body:JSON.stringify({message:draft.question})})});
 const before=await (await publicRequest('t1')).json();
 assert.notEqual(before.reply,draft.answer);
 assert.equal((await call('t1','POST',{action:'publish',id:'T1-001'})).status,200);
 const visible=await (await publicRequest('t1')).json();
 assert.equal(visible.reply,draft.answer);
 const other=await (await publicRequest('t2')).json();
 assert.notEqual(other.reply,draft.answer);
 assert.equal((await call('t1','POST',{action:'unpublish',id:'T1-001'})).status,200);
 const hidden=await (await publicRequest('t1')).json();
 assert.notEqual(hidden.reply,draft.answer);
});
test('editing a published answer returns it to draft',async()=>{
 await call('t1','POST',{action:'save',id:'T1-001',question:'Tarif special montaj local?',answer:'Actualizat după întâlnire'});
 const records=await (await call('t1')).json();
 assert.equal(records.records[0].status,'draft');
});
test('reject invalid content and unknown tenant',async()=>{
 assert.equal((await call('t1','POST',{action:'save',id:'!!',question:'?',answer:'??'})).status,400);
 assert.equal((await call('missing')).status,503);
});
test('mobile editor has narrow-screen layout and approval step',()=>{
 const html=readFileSync(new URL('../public/eva-4322-admin.html',import.meta.url),'utf8');
 for(const marker of ['max-width:600px','name="viewport"','Salvează Draft','Publică','window.confirm','textarea','type="password"','aria-live="polite"']){
  assert.ok(html.includes(marker),marker);
 }
 assert.ok(!html.includes('localStorage.setItem'));
});
