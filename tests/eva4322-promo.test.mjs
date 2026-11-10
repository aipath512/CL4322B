import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {normalizePromotion,activePromotion} from '../functions/api/_eva4322_promo.js';
import {onRequest as promoAdmin} from '../functions/api/eva-4322-promotion-admin.js';
import {onRequest as submitLead} from '../functions/api/eva-4322-lead.js';
import {readFileSync} from 'node:fs';
const key='secure-test-token-promotion-1234567';
const env={
 EVA_4322_TENANTS:JSON.stringify({t1:{origins:['https://client.example']},t2:{origins:['https://other.example']}}),
 EVA_4322_ADMIN_SHA256:JSON.stringify({t1:createHash('sha256').update(key).digest('hex')})
};
const promotions=new Map(),leads=new Map();
env.EVA_DB={prepare(sql){let args=[];return {
 bind(...a){args=a;return this},
 async first(){return promotions.get(args[0])||null;},
 async run(){
  if(sql.startsWith('INSERT INTO eva_promotions')){
    const [tenant_id,code,title,discount_kind,discount_value,currency,eligible_service,terms,valid_from,valid_until,enabled]=args;
    promotions.set(tenant_id,{tenant_id,code,title,discount_kind,discount_value,currency,eligible_service,terms,valid_from,valid_until,enabled});
    return {meta:{changes:1}};
  }
  if(sql.startsWith('INSERT INTO eva_leads')){
    const [tenant_id,lead_id,service,locality,contact,note,consent,promotion_code,promo_snapshot]=args;
    leads.set(tenant_id+':'+lead_id,{tenant_id,service,locality,contact,note,consent,promotion_code,promo_snapshot});
    return {meta:{changes:1}};
  }
  throw Error('Unexpected query');
 }
}}};
const promotion={code:'EVA10',title:'Promoție montaj',discount_kind:'percent',discount_value:10,currency:'RON',eligible_service:'Montaj centrală',terms:'Oferta se confirmă de firmă.',valid_from:'2026-01-01',valid_until:'2027-12-31',enabled:true};
function admin(method,body,token=key,origin='https://eva.example'){
 return promoAdmin({env,request:new Request('https://eva.example/api/eva-4322-promotion-admin?tenant=t1',{
  method,headers:{Origin:origin,Authorization:'Bearer '+token},
  ...(body?{body:JSON.stringify(body)}:{})
 })});
}
function lead(tenant,body,origin='https://client.example'){
 return submitLead({env,request:new Request('https://eva.example/api/eva-4322-lead?tenant='+tenant,{
  method:'POST',headers:{Origin:origin},body:JSON.stringify(body)
 })});
}
const input={service:'Montaj centrală termică',locality:'București',contact:'contact@example.ro',consent:true};
test('validate percent/fixed range, dates and disabled promo',()=>{
 assert.equal(normalizePromotion(promotion).discount_value,10);
 assert.throws(()=>normalizePromotion({...promotion,discount_value:101}),/invalidă/);
 assert.throws(()=>normalizePromotion({...promotion,valid_from:'2026-02-30'}),/invalidă/);
 assert.equal(activePromotion({...promotion,enabled:1},'Montaj centrală termică',new Date('2026-11-10T12:00:00Z')).code,'EVA10');
 assert.equal(activePromotion({...promotion,enabled:0},'Montaj centrală termică',new Date('2026-11-10T12:00:00Z')),null);
 assert.equal(activePromotion({...promotion,enabled:1},'Igienizare aer condiționat',new Date('2026-11-10T12:00:00Z')),null);
});
test('admin promo requires tenant credentials',async()=>{
 assert.equal((await admin('GET',null,'bad-password')).status,401);
 assert.equal((await admin('GET',null,key,'https://evil.example')).status,403);
 assert.equal((await admin('POST',promotion)).status,200);
 const data=await (await admin('GET')).json();
 assert.equal(data.promotion.code,'EVA10');
});
test('lead confirmation returns promotion only when eligible and saved',async()=>{
 const res=await lead('t1',input);
 const body=await res.json();
 assert.equal(res.status,201);
 assert.equal(body.ok,true);
 assert.equal(body.promotion.code,'EVA10');
 assert.ok(leads.has('t1:'+body.reference));
 const record=leads.get('t1:'+body.reference);
 assert.equal(record.promotion_code,'EVA10');
 assert.equal(JSON.parse(record.promo_snapshot).discount_value,10);
});
test('no offer leakage or fake confirmation for unrelated and invalid requests',async()=>{
 const other=await (await lead('t2',input,'https://other.example')).json();
 assert.equal(other.promotion,null);
 assert.equal((await lead('t1',{...input,consent:false})).status,400);
 assert.equal((await lead('t1',input,'https://evil.example')).status,403);
});
test('widgets show thank-you after confirmed API response and offer editor mobile',()=>{
 const widget=readFileSync(new URL('../public/eva-4322-widget.js',import.meta.url),'utf8');
 const adminUI=readFileSync(new URL('../public/eva-4322-admin.html',import.meta.url),'utf8');
 assert.ok(widget.includes("if(!res.ok||!data.ok)throw Error"));
 assert.ok(widget.includes('data.promotion.title'));
 assert.ok(widget.includes('consent.checked'));
 assert.ok(adminUI.includes('Reducere promoțională'));
 assert.ok(adminUI.includes('promo-enabled'));
});
