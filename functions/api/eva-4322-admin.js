// EVA-4322 company knowledge administration V0.5.
// Dedicated D1 binding EVA_DB only; never write to the TCS demo DB.
const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const encode=s=>new TextEncoder().encode(s);
const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
function equalConstant(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0;}
function validate(entry){
 const question=String(entry?.question||'').trim(),answer=String(entry?.answer||'').trim();
 const followup=String(entry?.followup||'').trim();
 const qaId=String(entry?.id||'').trim();
 if(!/^[A-Za-z0-9_-]{3,64}$/.test(qaId)||question.length<5||question.length>350||answer.length<3||answer.length>2500||followup.length>250)
   throw Error('ID, întrebare, răspuns sau follow-up invalid');
 return {qaId,question,answer,followup};
}
export async function onRequest({request,env}){
 const url=new URL(request.url),tenantId=url.searchParams.get('tenant')||'';
 let config={},keys={};
 try{config=JSON.parse(env.EVA_4322_TENANTS||'{}');keys=JSON.parse(env.EVA_4322_ADMIN_SHA256||'{}');}
 catch{return reply({error:'Configurație invalidă'},503);}
 if(!Object.hasOwn(config,tenantId)||!Object.hasOwn(keys,tenantId)||!env.EVA_DB)
   return reply({error:'Administrare neconfigurată'},503);
 // Host the admin app on the same HTTPS origin as this API; reject cross-site browser requests.
 const origin=request.headers.get('Origin');
 if(origin&&origin!==url.origin)return reply({error:'Origine neautorizată'},403);
 const authorization=request.headers.get('Authorization')||'';
 if(!authorization.startsWith('Bearer '))return reply({error:'Autentificare necesară'},401);
 const token=authorization.slice(7).trim();
 if(token.length<24||token.length>512)return reply({error:'Autentificare invalidă'},401);
 const hash=await digest(token);
 if(!equalConstant(hash,keys[tenantId]))return reply({error:'Acces interzis'},403);
 try{
  if(request.method==='GET'){
   const result=await env.EVA_DB.prepare('SELECT qa_id AS id, question, answer, followup, status, updated_at FROM eva_company_kb WHERE tenant_id=? ORDER BY updated_at DESC LIMIT 500').bind(tenantId).all();
   return reply({tenant:tenantId,records:result.results||[]});
  }
  if(request.method!=='POST')return reply({error:'Metodă nepermisă'},405);
  if(Number(request.headers.get('Content-Length')||0)>10000)return reply({error:'Conținut prea mare'},413);
  const raw=await request.text();if(raw.length>10000)return reply({error:'Conținut prea mare'},413);
  const body=JSON.parse(raw),action=body?.action;
  if(action==='save'){
   const e=validate(body);
   // Newly created knowledge is a draft by default; update keeps previous status only if unchanged.
   await env.EVA_DB.prepare("INSERT INTO eva_company_kb(tenant_id,qa_id,question,answer,followup,status,updated_at) VALUES(?,?,?,?,?,'draft',CURRENT_TIMESTAMP) ON CONFLICT(tenant_id,qa_id) DO UPDATE SET question=excluded.question,answer=excluded.answer,followup=excluded.followup,status='draft',updated_at=CURRENT_TIMESTAMP")
    .bind(tenantId,e.qaId,e.question,e.answer,e.followup).run();
   return reply({ok:true,id:e.qaId,status:'draft'});
  }
  if(action==='publish'||action==='unpublish'){
   const qaId=String(body?.id||'');
   if(!/^[A-Za-z0-9_-]{3,64}$/.test(qaId))return reply({error:'ID invalid'},400);
   const target=action==='publish'?'published':'draft';
   const res=await env.EVA_DB.prepare("UPDATE eva_company_kb SET status=?,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND qa_id=?").bind(target,tenantId,qaId).run();
   if(!res.meta?.changes)return reply({error:'Înregistrare inexistentă'},404);
   return reply({ok:true,id:qaId,status:target});
  }
  return reply({error:'Acțiune invalidă'},400);
 }catch(e){if(e instanceof SyntaxError)return reply({error:'JSON invalid'},400);if(String(e.message||'').includes('invalid'))return reply({error:e.message},400);return reply({error:'Eroare de stocare sau schemă D1'},503);}
}
