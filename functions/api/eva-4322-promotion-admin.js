import {authenticate,normalizePromotion,json} from './_eva4322_promo.js';
export async function onRequest({request,env}){
 const tenantId=new URL(request.url).searchParams.get('tenant')||'';
 const auth=await authenticate(request,env,tenantId);
 if(!auth.ok)return json({error:auth.error},auth.status);
 try{
  if(request.method==='GET'){
   const row=await env.EVA_DB.prepare('SELECT * FROM eva_promotions WHERE tenant_id=?').bind(tenantId).first();
   return json({tenant:tenantId,promotion:row||null});
  }
  if(request.method!=='POST')return json({error:'Metodă nepermisă'},405);
  const raw=await request.text();if(raw.length>5000)return json({error:'Conținut prea mare'},413);
  const body=JSON.parse(raw);
  const p=normalizePromotion(body);
  await env.EVA_DB.prepare(
   "INSERT INTO eva_promotions(tenant_id,code,title,discount_kind,discount_value,currency,eligible_service,terms,valid_from,valid_until,enabled,updated_at) "+
   "VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) "+
   "ON CONFLICT(tenant_id) DO UPDATE SET "+
   "code=excluded.code,title=excluded.title,discount_kind=excluded.discount_kind, "+
   "discount_value=excluded.discount_value,currency=excluded.currency, "+
   "eligible_service=excluded.eligible_service,terms=excluded.terms, "+
   "valid_from=excluded.valid_from,valid_until=excluded.valid_until,enabled=excluded.enabled, "+
   "updated_at=CURRENT_TIMESTAMP"
  ).bind(tenantId,p.code,p.title,p.discount_kind,p.discount_value,p.currency,
   p.eligible_service,p.terms,p.valid_from,p.valid_until,p.enabled).run();
  return json({ok:true,tenant:tenantId,promotion:p});
 }catch(e){
  if(e instanceof SyntaxError)return json({error:'JSON invalid'},400);
  if(String(e.message||'').startsWith('Promoție invalidă'))return json({error:e.message},400);
  return json({error:'Eroare de stocare sau migrare D1'},503);
 }
}