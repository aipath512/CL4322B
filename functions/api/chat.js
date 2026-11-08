// CL4322B v1.2 — asistent AI: Cloudflare Pages Function pe /api/chat + Workers AI
import { KNOWLEDGE } from "./_knowledge.js";
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const SYSTEM = `Ești asistentul AI al firmei CL4322B din București (instalații de încălzire, climatizare și sanitare).
Răspunzi în limba română, politicos (dumneavoastră), scurt: maximum 5 propoziții.
Folosești DOAR informațiile de mai jos. Dacă informația lipsește, spui că nu o ai și recomanzi telefonul 021 000 4322.
Nu faci programări, nu confirmi prețuri finale, nu inventezi servicii, prețuri sau autorizații.
Spui, dacă ești întrebat, că firma și datele ei sunt fictive (site etalon demonstrativ).
INFORMAȚII:
${KNOWLEDGE}`;
const hits = new Map();
function limited(ip){const now=Date.now(),w=60000;const a=(hits.get(ip)||[]).filter(t=>now-t<w);a.push(now);hits.set(ip,a);return a.length>8;}
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
export async function onRequestGet(){return json({status:"ready"});}
export async function onRequestPost({request, env}){
  if(!env.AI) return json({error:"Asistentul nu este configurat (lipsește legătura AI)."},503);
  const ip=request.headers.get("CF-Connecting-IP")||"x";
  if(limited(ip)) return json({error:"Prea multe mesaje. Încercați peste un minut."},429);
  const raw=await request.text(); if(raw.length>16000) return json({error:"Mesaj prea lung."},413);
  let body; try{body=JSON.parse(raw);}catch{return json({error:"Format invalid."},400);}
  const msg=String(body.message||"").trim().slice(0,1200); if(!msg) return json({error:"Mesaj gol."},400);
  const hist=(Array.isArray(body.history)?body.history:[]).slice(-6).filter(m=>m&&(m.role==="user"||m.role==="assistant")).map(m=>({role:m.role,content:String(m.content||"").slice(0,1200)}));
  try{
    const r=await env.AI.run(MODEL,{messages:[{role:"system",content:SYSTEM},...hist,{role:"user",content:msg}],max_tokens:400});
    const reply=(r&&r.response?String(r.response):"").trim();
    if(!reply) return json({error:"Răspuns gol."},502);
    return json({reply});
  }catch(e){return json({error:"Asistentul nu poate răspunde acum."},502);}
}
