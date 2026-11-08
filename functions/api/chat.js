// TCS INSTAL v2.7.1 (căutare rapidă: Eva primește doar rândurile potrivite întrebării) — asistent AI: Cloudflare Pages Function pe /api/chat + Workers AI
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
export async function onRequestGet({env}){return json({status:"ready",ai:!!(env&&env.AI),version:"v2.7.1"});}
// Căutare în conținutul site-ului: folosită când Workers AI lipsește sau dă eroare
const LINES=KNOWLEDGE.split("\n");
const GENERAL=LINES.filter(l=>!l.startsWith("["));
const clean=l=>l.replace(/ Cuvinte cheie:.*$/,"").replace(/ Include:  Când: /," ");
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const NL=LINES.map(l=>l.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""));
const STOP=new Set("cat costa ce este sunt pentru care cum unde la de si sau un o in cu pe din mai ce-i va vă imi ati aveti oferiti face faceti".split(" "));
function rank(q,n){
  const w=norm(q).split(/[^a-z0-9]+/).filter(t=>t.length>2&&!STOP.has(t));if(!w.length)return [];
  const N=LINES.length,df=t=>{let d=0;for(const l of NL){if(l.includes(t.slice(0,6)))d++}return d};
  const idf={};w.forEach(t=>idf[t]=Math.log((N+1)/(df(t)+0.5)));
  return LINES.map((l,i)=>{const nl=NL[i];let s=0;for(const t of w){if(nl.includes(t))s+=2*idf[t];else if(t.length>5&&nl.includes(t.slice(0,5)))s+=idf[t];else if(t.length>=5&&nl.includes(t.slice(0,4)))s+=0.6*idf[t]}return [s,l]}).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,n).map(x=>x[1]);
}
function search(q){
  const w=norm(q).split(/[^a-z0-9]+/).filter(t=>t.length>2&&!STOP.has(t));
  if(!w.length) return null;
  const sc=LINES.map(l=>{const n=norm(l);let s=0;for(const t of w){if(n.includes(t))s+=t.length>4?2:1;else if(t.length>5&&n.includes(t.slice(0,5)))s+=1;}return [s,l];}).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,3);
  if(!sc.length) return null;
  return "Din informațiile de pe site:\n"+sc.map(x=>"• "+clean(x[1]).replace(/^\[[^\]]+\]\s*/,"")).join("\n")+"\n\nPentru programare sau preț final: 021 000 4322, email@etalon.com.";
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
    const prev=hist.filter(m=>m.role==="user").slice(-1).map(m=>m.content).join(" ");
    const top=rank(msg+" "+prev,14);const sys=SYSTEM+"\nTe adresezi clientului cu «dumneavoastră», niciodată cu «tu». Nu începi răspunsul cu cuvântul «Dumneavoastră».\nINFORMAȚII GENERALE:\n"+GENERAL.join("\n")+(top.length?`\n\nINFORMAȚII DE PE SITE CARE SE POTRIVESC ÎNTREBĂRII (cel mai potrivit primul). Răspunde pe baza lor; nu spune că nu ai informații dacă una dintre ele se potrivește:\n${top.join("\n")}`:"");
    let r;const args={messages:[{role:"system",content:sys},...hist,{role:"user",content:msg}],max_tokens:400,temperature:0.1};
    try{r=await env.AI.run(MODEL,args);}catch(e1){r=await env.AI.run(MODEL_FALLBACK,args);}
    const reply=(r&&r.response?String(r.response):"").trim();
    if(!reply || (top.length && /nu (am|dețin|detin) (informa|date)|nu am g[ăa]sit/i.test(reply))) return json({reply:search(msg)||FALLBACK,source:"site"});
    return json({reply});
  }catch(e){return json({reply:search(msg)||FALLBACK,source:"site"});}
}
