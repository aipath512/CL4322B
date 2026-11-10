// EVA-4322 promo V0.6, tenant-scoped; shared with admin and lead API.
export function normalizePromotion(p) {
 const kind=String(p?.discount_kind||'');
 const value=Number(p?.discount_value);
 const from=String(p?.valid_from||''),until=String(p?.valid_until||'');
 const code=String(p?.code||'').trim().toUpperCase();
 const title=String(p?.title||'').trim();
 const service=String(p?.eligible_service||'').trim();
 const terms=String(p?.terms||'').trim();
 const currency=String(p?.currency||'RON').toUpperCase();
 const enabled=p?.enabled===true||p?.enabled===1;
 if(!['percent','fixed'].includes(kind)||!Number.isSafeInteger(value)||value<1||(kind==='percent'&&value>100)||
    (kind==='fixed'&&value>1000000)||!['RON','EUR'].includes(currency)||
    !/^[A-Z0-9_-]{3,30}$/.test(code)||title.length<3||title.length>100||
    service.length>120||terms.length>500||
    !/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(until)||
    !Number.isFinite(Date.parse(from+'T00:00:00Z'))||!Number.isFinite(Date.parse(until+'T00:00:00Z'))||
    new Date(from+'T00:00:00Z').toISOString().slice(0,10)!==from||
    new Date(until+'T00:00:00Z').toISOString().slice(0,10)!==until||
    from>until)throw Error('Promoție invalidă: procent 1–100 sau sumă pozitivă, date valide și condiții complete.');
 return {code,title,discount_kind:kind,discount_value:value,currency,eligible_service:service,terms,valid_from:from,valid_until:until,enabled:enabled?1:0};
}
export function activePromotion(row,service,now=new Date()){
 if(!row||Number(row.enabled)!==1)return null;
 const date=new Date(now).toISOString().slice(0,10);
 if(date<row.valid_from||date>row.valid_until)return null;
 const relevant=String(row.eligible_service||'').trim().toLocaleLowerCase('ro');
 if(relevant && !String(service||'').toLocaleLowerCase('ro').includes(relevant))return null;
 return {
  code:String(row.code),title:String(row.title),discount_kind:row.discount_kind,
  discount_value:Number(row.discount_value),currency:String(row.currency),
  eligible_service:String(row.eligible_service||''),terms:String(row.terms||''),
  valid_until:row.valid_until
 };
}
export const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}
});
export async function authenticate(request,env,tenantId){
 let tenants,keys;
 try{tenants=JSON.parse(env.EVA_4322_TENANTS||'{}');keys=JSON.parse(env.EVA_4322_ADMIN_SHA256||'{}');}
 catch{return {error:'Configurație invalidă',status:503};}
 if(!env.EVA_DB||!Object.hasOwn(tenants,tenantId)||!Object.hasOwn(keys,tenantId))
   return {error:'Administrare neconfigurată',status:503};
 const url=new URL(request.url),origin=request.headers.get('Origin');
 if(origin&&origin!==url.origin)return {error:'Origine neautorizată',status:403};
 const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'').trim();
 if(token.length<24||token.length>512)return {error:'Autentificare necesară',status:401};
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
 const expected=keys[tenantId];
 if(typeof expected!=='string'||expected.length!==hash.length)return {error:'Acces interzis',status:403};
 let diff=0;for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^expected.charCodeAt(i);
 if(diff!==0)return {error:'Acces interzis',status:403};
 return {ok:true,tenant:tenants[tenantId]};
}
