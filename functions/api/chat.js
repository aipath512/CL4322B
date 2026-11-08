// TCS INSTAL v2.9 — Eva Hybrid Search: cu FTS_ENABLE=1 motorul implicit este hibrid (FTS5/D1 + IDF); fără el sau fără index valid, IDF (căutare rapidă: Eva primește doar rândurile potrivite întrebării) — asistent AI: Cloudflare Pages Function pe /api/chat + Workers AI
import { KNOWLEDGE } from "./_knowledge.js";
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MODEL_FALLBACK = "@cf/meta/llama-3.1-8b-instruct-fp8";
const SYSTEM = `Te numești Eva și ești asistentul AI al firmei TCS INSTAL din București (instalații de încălzire, climatizare și sanitare).
Răspunzi în limba română, politicos (dumneavoastră), scurt: maximum 5 propoziții.
Folosești DOAR informațiile de mai jos. Dacă informația lipsește, spui că nu o ai și recomanzi telefonul 021 000 4322.
Nu faci programări, nu confirmi prețuri finale, nu inventezi servicii, prețuri, garanții sau autorizații. Citezi doar ce scrie explicit mai jos, fără să combini sau să extinzi informațiile.
Spui, dacă ești întrebat, că firma și datele ei sunt fictive (site etalon demonstrativ).`;
const hits = new Map();
function limited(ip){const now=Date.now(),w=60000;const a=(hits.get(ip)||[]).filter(t=>now-t<w);a.push(now);hits.set(ip,a);return a.length>8;}
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
export async function onRequestGet({env}){
  let fts=null;if(env&&env.DB){try{await ensureIndex(env.DB);const a=await env.DB.prepare("SELECT (SELECT count(*) FROM k) n,(SELECT count(*) FROM ab_log) ab,(SELECT count(*) FROM ab_log WHERE same=1) same").first();fts={index:a.n,ab_intrebari:a.ab,ab_acelasi_prim_rezultat:a.same,hash:KH};}catch(e){fts={eroare:String(e).slice(0,120)};}}
  return json({status:"ready",ai:!!(env&&env.AI),version:"v2.9",motor_activ:(String(env&&env.FTS_ENABLE||"")==="1"&&fts&&!fts.eroare)?"hybrid":"idf",fts5:fts});}
// Căutare în conținutul site-ului: folosită când Workers AI lipsește sau dă eroare
const LINES=KNOWLEDGE.split("\n");
const GENERAL=LINES.filter(l=>!l.startsWith("["));
const clean=l=>l.replace(/ Cuvinte cheie:.*$/,"").replace(/ Include:  Când: /," ");
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const NL=LINES.map(l=>l.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""));
const QP=NL.map(l=>{const i=l.indexOf("intrebare:"),j=l.indexOf("raspuns:");return i>-1&&j>i?l.slice(i,j):""});
const STOP=new Set("pot vreau cat costa ce este sunt pentru care cum unde la de si sau un o in cu pe din mai ce-i va vă imi ati aveti oferiti face faceti".split(" "));
function rank(q,n){
  const w=norm(q).split(/[^a-z0-9]+/).filter(t=>t.length>2&&!STOP.has(t));if(!w.length)return [];
  const N=LINES.length,df=t=>{let d=0;for(const l of NL){if(l.includes(t.slice(0,6)))d++}return d};
  const idf={};w.forEach(t=>idf[t]=Math.log((N+1)/(df(t)+0.5)));
  return LINES.map((l,i)=>{const nl=NL[i];let s=0;for(const t of w){if(nl.includes(t))s+=2*idf[t];else if(t.length>5&&nl.includes(t.slice(0,5)))s+=idf[t];else if(t.length>=5&&nl.includes(t.slice(0,4)))s+=0.6*idf[t];if(QP[i]&&QP[i].includes(t.length>=5?t.slice(0,4):t))s+=1.5*idf[t]}return [s,l]}).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,n).map(x=>x[1]);
}
function search(q){
  const w=norm(q).split(/[^a-z0-9]+/).filter(t=>t.length>2&&!STOP.has(t));
  if(!w.length) return null;
  const sc=LINES.map(l=>{const n=norm(l);let s=0;for(const t of w){if(n.includes(t))s+=t.length>4?2:1;else if(t.length>5&&n.includes(t.slice(0,5)))s+=1;}return [s,l];}).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,3);
  if(!sc.length) return null;
  return "Din informațiile de pe site:\n"+sc.map(x=>"• "+clean(x[1]).replace(/^\[[^\]]+\]\s*/,"")).join("\n")+"\n\nPentru programare sau preț final: 021 000 4322, email@etalon.com.";
}
// ---- FTS5 / D1 (în paralel). Sursa de adevăr rămâne _knowledge.js; indexul se reconstruiește când se schimbă.
let KH=null,SYNCED=false;
async function khash(){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(KNOWLEDGE));return [...new Uint8Array(h)].slice(0,8).map(x=>x.toString(16).padStart(2,"0")).join("");}
async function ensureIndex(db){
  // Read-only on the request path: importing hundreds of FTS rows here would
  // exceed the Free-plan D1 subrequest budget and risks repeated write charges.
  // tools/build-fts5-seed.mjs creates the import SQL at deployment time.
  if(SYNCED)return;
  KH=KH||await khash();
  const r=await db.prepare("SELECT val FROM meta WHERE key='k_hash'").first();
  if(!r||r.val!==KH)throw new Error("FTS5 index missing or stale. Apply migration and generated seed.");
  SYNCED=true;
}
const stem=w=>w.length<=6?w.slice(0,4):w.slice(0,5);
async function ftsRank(db,q,n){
  const w=norm(q).split(/[^a-z0-9]+/).filter(t=>t.length>2&&!STOP.has(t));if(!w.length)return [];
  const expr=w.map(t=>t.length>=5?`"${stem(t)}"*`:`"${t}"*`).join(" OR ");
  const r=await db.prepare("SELECT body FROM k WHERE k MATCH ? ORDER BY bm25(k,3.0,1.0) LIMIT ?").bind(expr,n).all();
  return (r.results||[]).map(x=>x.body);
}
function hybrid(f,i,n){const out=[...f.slice(0,10)];for(const l of i){if(out.length>=n)break;if(!out.includes(l))out.push(l);}return out.slice(0,n);}
const FALLBACK="Nu am găsit asta în informațiile de pe site. Vă rugăm sunați la 021 000 4322 sau scrieți la email@etalon.com.";
export async function onRequestPost({request, env, waitUntil}){
  
  const ip=request.headers.get("CF-Connecting-IP")||"x";
  if(limited(ip)) return json({error:"Prea multe mesaje. Încercați peste un minut."},429);
  const raw=await request.text(); if(raw.length>16000) return json({error:"Mesaj prea lung."},413);
  let body; try{body=JSON.parse(raw);}catch{return json({error:"Format invalid."},400);}
  const msg=String(body.message||"").trim().slice(0,1200); if(!msg) return json({error:"Mesaj gol."},400);
  const hist=(Array.isArray(body.history)?body.history:[]).slice(-6).filter(m=>m&&(m.role==="user"||m.role==="assistant")).map(m=>({role:m.role,content:String(m.content||"").slice(0,1200)}));
  if(!env.AI) return json({reply:search(msg)||FALLBACK,source:"site"});
  try{
    const prev=hist.filter(m=>m.role==="user").slice(-1).map(m=>m.content).join(" ");
    const qq=msg+" "+prev,idfTop=rank(qq,14);let ftsTop=null;
    if(env.DB){try{await ensureIndex(env.DB);ftsTop=await ftsRank(env.DB,qq,14);
      const log=env.DB.prepare("INSERT INTO ab_log(ts,q,idf_top,fts_top,same) VALUES(?,?,?,?,?)").bind(new Date().toISOString(),msg.slice(0,300),(idfTop[0]||"").slice(0,160),(ftsTop[0]||"").slice(0,160),(idfTop[0]||"")===(ftsTop[0]||"")?1:0).run();
      if(waitUntil)waitUntil(log);else await log;}catch(e){ftsTop=null;}}
    // Public requests cannot enable FTS without the operator switch FTS_ENABLE.
    // IDF stays active until an operator explicitly sets FTS_ENABLE=1.
    const allowFts=String(env.FTS_ENABLE||"")==="1";
    // With FTS_ENABLE=1 the default becomes hybrid (FTS5 top 10 + IDF fill); IDF is used whenever the index is unavailable.
    const engine=!(allowFts&&ftsTop)?"idf":body.engine==="idf"?"idf":body.engine==="fts"?"fts":"hybrid";
    const top=engine==="fts"?ftsTop:engine==="hybrid"?hybrid(ftsTop,idfTop,14):idfTop;const sys=SYSTEM+"\nTe adresezi clientului cu «dumneavoastră», niciodată cu «tu». Nu începi răspunsul cu cuvântul «Dumneavoastră».\nINFORMAȚII GENERALE:\n"+GENERAL.join("\n")+(top.length?`\n\nINFORMAȚII DE PE SITE CARE SE POTRIVESC ÎNTREBĂRII (cel mai potrivit primul). Răspunde pe baza lor; nu spune că nu ai informații dacă una dintre ele se potrivește:\n${top.join("\n")}`:"");
    let r;const args={messages:[{role:"system",content:sys},...hist,{role:"user",content:msg}],max_tokens:400,temperature:0.1};
    try{r=await env.AI.run(MODEL,args);}catch(e1){r=await env.AI.run(MODEL_FALLBACK,args);}
    const reply=(r&&r.response?String(r.response):"").trim();
    if(!reply || (top.length && /nu (am|dețin|detin) (informa|date)|nu am g[ăa]sit/i.test(reply))) return json({reply:search(msg)||FALLBACK,source:"site"});
    return json({reply,engine});
  }catch(e){return json({reply:search(msg)||FALLBACK,source:"site"});}
}
