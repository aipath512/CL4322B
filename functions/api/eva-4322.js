import { C4322_FAQ_CANDIDATES } from './_eva4322_candidates.js';
// EVA-4322 V0.1 — isolated API, no TCS INSTAL data.
const rows=[
 ['centrala_apartament','Ce centrala aleg pentru apartament?','Alegerea depinde de pierderile de caldura, izolatie si necesarul de apa calda. Solicitati dimensionarea de catre un specialist.','Cate bai aveti?'],
 ['centrala_24kw','Este suficienta centrala de 24 kW?','24 kW poate fi un reper pentru prepararea apei calde, dar nu stabileste singur necesarul termic. Conteaza pierderile si consumul simultan.','Cate bai sunt folosite simultan?'],
 ['presiune','De ce scade presiunea centralei?','Pot exista pierderi de apa, aer in circuit sau o problema la vasul de expansiune. La scaderi repetate, cereti verificarea tehnica.','Scade presiunea zilnic?'],
 ['condensare','Ce este centrala in condensare?','Recupereaza o parte din caldura continuta in vaporii din gazele de ardere. Eficienta depinde de instalatie si reglaje.','Doriti sa comparati cu centrala veche?'],
 ['montaj','Pot monta singur centrala pe gaz?','Nu efectuati lucrari la instalatia de gaz ori punerea in functiune. Apelati la personal autorizat pentru activitatile reglementate.','Este vorba de montaj nou sau inlocuire?'],
 ['calorifer_sus','De ce caloriferul e rece sus?','Aerul acumulat in partea superioara este o cauza posibila. Respectati instructiunile instalatiei si solicitati ajutor daca persista.','Se intampla la toate caloriferele?'],
 ['calorifer_jos','De ce caloriferul e rece jos?','Poate indica debit insuficient sau depuneri; o diferenta moderata de temperatura poate fi normala.','Caloriferul se incalzeste macar partial?'],
 ['consum','Cum reduc consumul centralei?','Termostatul potrivit, reglajele corecte si intretinerea conform producatorului pot limita incalzirea inutila.','Aveti termostat programabil?'],
 ['apa_calda','De ce nu am apa calda?','Cauzele pot include debitul apei, senzorii sau schimbatorul de caldura. Nu desfaceti centrala.','Este afisat un cod de eroare?'],
 ['oferta','Cum cer oferta pentru montaj de centrala?','Indicati localitatea, tipul locuintei, modelul dorit si instalatia existenta. Pretul final trebuie confirmat in deviz.','In ce localitate este lucrarea?']
];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const STOP=new Set('ce cum de la pe un o si sau este sunt pentru pot vreau meu mea imi am in cu din mai'.split(' '));
const terms=s=>[...new Set(norm(s).split(' ').filter(w=>w.length>2&&!STOP.has(w)))];
const respond=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
export async function onRequest({request,env}){
 const u=new URL(request.url),id=u.searchParams.get('tenant')||'',origin=request.headers.get('Origin')||'';
 let cfg={};try{cfg=JSON.parse(env.EVA_4322_TENANTS||'{}')}catch{return respond({error:'Invalid tenant configuration'},503)}
 const tenant=Object.hasOwn(cfg,id)?cfg[id]:null;
 if(!tenant||!(tenant.origins||[]).some(o=>{try{return new URL(o).origin===origin&&new URL(o).protocol==='https:'}catch{return false}}))return respond({error:'Unauthorized tenant/origin'},403);
 const cors={'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'Content-Type'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return respond({error:'Method not allowed'},405,cors);
 let text;try{text=await request.text();if(text.length>4096)throw Error()}catch{return respond({error:'Payload too large'},413,cors)}
 let message;try{message=String(JSON.parse(text).message||'').trim()}catch{return respond({error:'Invalid JSON'},400,cors)}
 if(!message||message.length>1000)return respond({error:'Invalid message'},400,cors);
 if(/miros (de )?gaz|scurgere de gaz|scapari de gaz/.test(norm(message)))
   return respond({reply:'Daca suspectati o scurgere de gaz, parasiti zona afectata. Nu actionati intrerupatoare electrice. Contactati operatorul de urgenta al retelei de gaze sau 112 in caz de pericol imediat.',intent:'siguranta',followup:'',source:'safety-rule'},200,cors);
 const qa=(Array.isArray(tenant.qa)?tenant.qa:[]).filter(r=>r&&r.question&&r.answer).map(r=>[r.id||'custom',r.question,r.answer,r.followup||'']);
 const candidates=C4322_FAQ_CANDIDATES.map(f=>[f.id,f.question,f.answer,'']);
 const all=[...qa,...rows,...candidates],qt=terms(message),docs=all.map(r=>terms(r[1]+' '+r[2])),df=new Map();
 for(const d of docs)for(const t of d)df.set(t,(df.get(t)||0)+1);
 const ranking=all.map((r,i)=>{let score=0,question=new Set(terms(r[1])),body=new Set(docs[i]);for(const t of qt){const idf=Math.log(1+(all.length-(df.get(t)||0)+.5)/((df.get(t)||0)+.5));score+=question.has(t)?3*idf:body.has(t)?idf:0}return {r,score:score+(i<qa.length&&score>0?2:0)}}).sort((a,b)=>b.score-a.score);
 const best=ranking[0];if(!best||best.score<0.6)return respond({reply:'Nu am un raspuns verificat pentru aceasta intrebare. Contactati firma pentru clarificare.',followup:'Doriti datele de contact?',source:'fallback'},200,cors);
 return respond({reply:best.r[2],followup:best.r[3],source:best.r[0],tenant:id,version:'0.2.0',kbCount:rows.length+C4322_FAQ_CANDIDATES.length,reviewStatus:best.r[0].startsWith('FAQ-')?'demo-unverified':'pilot'},200,cors);
}
