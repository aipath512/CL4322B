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

test('returns actionable same-service follow-ups with funnel stage',async()=>{
 const result=await (await req('https://first.example','t1','Ce presupune serviciul Montaj centrală termică?')).json();
 assert.ok(Array.isArray(result.followups));
 assert.ok(result.followups.length>=1 && result.followups.length<=3);
 assert.ok(result.followups.every(x=>typeof x.question==='string' && x.question.length>0));
 assert.ok(['TOFU','MOFU','BOFU'].includes(result.funnelStage));
});
test('offers tenant-specific follow-up only inside tenant',async()=>{
 const a=await (await req('https://first.example','t1','Oferiti servicii sambata?')).json();
 assert.equal(a.followups[0].question,'Doriti sa trimiteti cererea?');
 const b=await (await req('https://second.example','t2','Oferiti servicii sambata?')).json();
 assert.ok(!(b.followups||[]).some(x=>x.question==='Doriti sa trimiteti cererea?'));
});
test('safety response offers no commercial follow-up',async()=>{
 const data=await (await req('https://first.example','t1','Miroase a gaz')).json();
 assert.equal(data.intent,'siguranta');assert.deepEqual(data.followups,[]);
});
test('unknown question does not fabricate follow-up recommendations',async()=>{
 const data=await (await req('https://first.example','t1','zzxvqqx ipsum 9890')).json();
 assert.deepEqual(data.followups,[]);
});
test('widget supports resize, fullscreen, copying, selectable followups, mobile',async()=>{
 const {readFileSync}=await import('node:fs');
 const widget=readFileSync(new URL('../public/eva-4322-widget.js',import.meta.url),'utf8');
 for(const feature of ['resize:both','fullscreen','ResizeObserver','localStorage','navigator.clipboard','copyAll','copyButton','submitMessage(question)','max-width:600px','aria-expanded'])assert.ok(widget.includes(feature),feature);
});

test('contextual answer to two bathrooms uses previous apartment question',async()=>{
 const request=new Request('https://eva.example/api/eva-4322?tenant=t1',{
   method:'POST',headers:{Origin:'https://first.example','content-type':'application/json'},
   body:JSON.stringify({message:'Două băi',history:[
     {role:'user',content:'Ce centrală aleg pentru apartamentul meu?'},
     {role:'assistant',content:'Alegerea depinde de pierderile de căldură. Câte băi aveți?'}
   ]})
 });
 const response=await onRequest({request,env}),data=await response.json();
 assert.equal(response.status,200);
 assert.equal(data.contextUsed,true);
 assert.equal(data.funnelStage,'MOFU');
 assert.ok(data.reply.includes('două băi'));
 assert.equal(data.followups[0].question,'Folosiți simultan cele două dușuri?');
});
test('no contextual inference from unrelated or missing history',async()=>{
 const request=new Request('https://eva.example/api/eva-4322?tenant=t1',{
   method:'POST',headers:{Origin:'https://first.example','content-type':'application/json'},
   body:JSON.stringify({message:'Două băi',history:[
     {role:'user',content:'Ce robinet aleg la chiuvetă?'},
     {role:'assistant',content:'Verificați diametrul și compatibilitatea.'}
   ]})
 });
 const data=await (await onRequest({request,env})).json();
 assert.notEqual(data.source,'contextual-4322-two-bathrooms');
});
test('current gas emergency overrides any prior conversation',async()=>{
 const request=new Request('https://eva.example/api/eva-4322?tenant=t1',{
   method:'POST',headers:{Origin:'https://first.example','content-type':'application/json'},
   body:JSON.stringify({message:'Miroase a gaz',history:[
     {role:'user',content:'Ce centrală aleg pentru apartament?'},
     {role:'assistant',content:'Care este suprafața?'}
   ]})
 });
 const data=await (await onRequest({request,env})).json();
 assert.equal(data.intent,'siguranta');
 assert.deepEqual(data.followups,[]);
});
test('widget includes bounded conversational history but does not persist transcript',async()=>{
 const {readFileSync}=await import('node:fs');
 const widget=readFileSync(new URL('../public/eva-4322-widget.js',import.meta.url),'utf8');
 assert.ok(widget.includes('history:transcript.slice(-9,-1)'));
 assert.ok(!widget.includes('localStorage.setItem(storageKey, JSON.stringify(transcript'));
});

test('theme toggle starts light, supports dark, and persists tenant-specific choice',async()=>{
 const {readFileSync}=await import('node:fs');
 const widget=readFileSync(new URL('../public/eva-4322-widget.js',import.meta.url),'utf8');
 for(const key of ['const themeKey','eva4322:theme:','savedTheme = \'light\'','applyTheme(savedTheme)','themeButton.addEventListener','localStorage.setItem(themeKey, next)','panel.dataset.theme','aria-pressed'])assert.ok(widget.includes(key),key);
 assert.ok(widget.includes("panel.dataset.theme = dark ? 'dark' : 'light'"));
});
test('light and dark palettes, original patterned background and legible chat controls are provided',async()=>{
 const {readFileSync}=await import('node:fs');
 const widget=readFileSync(new URL('../public/eva-4322-widget.js',import.meta.url),'utf8');
 for(const key of ['--eva-bg:#efeae2','--eva-bg:#0b141a','--eva-user:#d9fdd3','--eva-user:#005c4b','--eva-bot:#fff','--eva-bot:#202c33','patternSvg','encodeURIComponent(patternSvg)','background-size:230px','lead-form','--eva-input'])assert.ok(widget.includes(key),key);
 assert.ok(!widget.includes('https://web.whatsapp.com'));
});
