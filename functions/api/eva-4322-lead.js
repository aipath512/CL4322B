import {activePromotion,json} from './_eva4322_promo.js';
export async function onRequest({request,env}){
 if(request.method!=='POST')return json({error:'Metodă nepermisă'},405);
 const url=new URL(request.url),tenantId=url.searchParams.get('tenant')||'',origin=request.headers.get('Origin')||'';
 let configs;try{configs=JSON.parse(env.EVA_4322_TENANTS||'{}')}catch{return json({error:'Configurație invalidă'},503);}
 if(!env.EVA_DB||!Object.hasOwn(configs,tenantId))return json({error:'Serviciu neconfigurat'},503);
 if(!(configs[tenantId].origins||[]).some(x=>{try{return new URL(x).origin===origin && new URL(x).protocol==='https:'}catch{return false}}))
   return json({error:'Origine neautorizată'},403);
 const cors={'access-control-allow-origin':origin,'vary':'Origin'};
 try{
  const raw=await request.text();if(raw.length>5000)return json({error:'Conținut prea mare'},413,cors);
  const body=JSON.parse(raw);
  const service=String(body.service||'').trim(),locality=String(body.locality||'').trim(),
   contact=String(body.contact||'').trim(),note=String(body.note||'').trim();
  if(service.length<3||service.length>120||locality.length<2||locality.length>120||
     contact.length<5||contact.length>180||note.length>1000||body.consent!==true)
     return json({error:'Completați serviciul, localitatea, datele de contact și consimțământul.'},400,cors);
  const leadId=crypto.randomUUID();
  const p=await env.EVA_DB.prepare('SELECT * FROM eva_promotions WHERE tenant_id=?').bind(tenantId).first();
  const promo=activePromotion(p,service);
  await env.EVA_DB.prepare(
   'INSERT INTO eva_leads(tenant_id,lead_id,service,locality,contact,note,consent,promotion_code,promo_snapshot) VALUES(?,?,?,?,?,?,?,?,?)'
  ).bind(tenantId,leadId,service,locality,contact,note,1,promo?.code||null,promo?JSON.stringify(promo):null).run();
  return json({ok:true,reference:leadId,service,locality,promotion:promo,
   confirmation:'Cererea a fost înregistrată. Firma va confirma oferta și orice reducere aplicabilă.'},201,cors);
 }catch(e){if(e instanceof SyntaxError)return json({error:'JSON invalid'},400,cors);
   return json({error:'Cererea nu a fost înregistrată; reîncercați.'},503,cors);}
}