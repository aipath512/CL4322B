// CL4322B v1.5 — asistent AI: Cloudflare Pages Function pe /api/chat + Workers AI
import { KNOWLEDGE } from "./_knowledge.js";
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const SYSTEM = `Ești asistentul AI al firmei CL4322B din București (instalații de încălzire, climatizare și sanitare).
Răspunzi în limba română, politicos (dumneavoastră), scurt: maximum 5 propoziții.
Folosești DOAR informațiile de mai jos. Dacă informația lipsește, spui că nu o ai și recomanzi telefonul 021 000 4322.
Nu faci programări, nu confirmi prețuri finale, nu inventezi servicii, prețuri, garanții sau autorizații. Citezi doar ce scrie explicit mai jos, fără să combini sau să extinzi informațiile.
Spui, dacă ești întrebat, că firma și datele ei sunt fictive (site etalon demonstrativ).
INFORMAȚII:
${KNOWLEDGE}`;
const hits = new Map();
function limited(ip){const now=Date.now(),w=60000;const a=(hits.get(ip)||[]).filter(t=>now-t<w);a.push(now);hits.set(ip,a);return a.length>8;}
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
export async function onRequestGet({env}){return json({status:"ready",ai:!!(env&&env.AI),version:"v1.5"});}
// Căutare în conținutul site-ului: folosită când Workers AI lipsește sau dă eroare
const LINES=KNOWLEDGE.split("\n");
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const STOP=new Set("cat costa ce este sunt pentru care cum unde la de si sau un o in cu pe din mai ce-i va vă imi ati aveti oferiti face faceti".split(" "));
function search(q){
  const w=norm(q).split(/[^a-z0-9]+/).filter(t=>t.length>2&&!STOP.has(t));
  if(!w.length) return null;
  const sc=LINES.map(l=>{const n=norm(l);let s=0;for(const t of w){if(n.includes(t))s+=t.length>4?2:1;else if(t.length>5&&n.includes(t.slice(0,5)))s+=1;}return [s,l];}).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,3);
  if(!sc.length) return null;
  return "Din informațiile de pe site:\n"+sc.map(x=>"• "+x[1].replace(/^\[[^\]]+\]\s*/,"")).join("\n")+"\n\nPentru programare sau preț final: 021 000 4322, email@etalon.com.";
}
const FALLBACK="Nu am găsit asta în informațiile de pe site. Vă rugăm sunați la 021 000 4322 sau scrieți la email@etalon.com.";
export async function onRequestPost({request, env}){
  
  const ip=request.headers.get("CF-Connecting-IP")||"x";
  if(limited(ip)) return json({error:"Prea multe mesaje. Încercați peste un minut."},429);
  const raw=await request.text(); if(raw.length>16000) return json({error:"Mesaj prea lung."},413);
  let body; try{body=JSON.parse(raw);}catch{return json({error:"Format invalid."},400);}
  const msg=String(body.message||"").trim().slice(0,1200); if(!msg) return json({error:"Mesaj gol."},400);
  const hist=(Array.isArray(body.history)?body.history:[]).slice(-6).filter(m=>m&&(m.role==="user"||m.role==="assistant")).map(m=>({role:m.role,content:String(m.content||"").slice(0,1200)}));
  if(!env.AI) return json({reply:search(msg)||FALLBACK,source:"site"});
  try{
    const r=await env.AI.run(MODEL,{messages:[{role:"system",content:SYSTEM},...hist,{role:"user",content:msg}],max_tokens:400,temperature:0.2});
    const reply=(r&&r.response?String(r.response):"").trim();
    if(!reply) return json({reply:search(msg)||FALLBACK,source:"site"});
    return json({reply});
  }catch(e){return json({reply:search(msg)||FALLBACK,source:"site"});}
}
