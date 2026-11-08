# TCS INSTAL (repo CL4322B) — site etalon CAEN 4322 (v1.2, 2026-11-08)

Site demonstrativ al unei firme **fictive** de instalații (încălzire, climatizare, sanitare) din București. Toate datele firmei și persoanele sunt fictive. Paginile au `noindex` și `robots.txt` blochează indexarea.

## Pagini
index, despre, servicii, produse, mentenanta, garantii, certificari, oferta, termeni, cookies, confidentialitate, ai-act.

## Asistent AI
`functions/api/chat.js` (Cloudflare Pages Function pe `/api/chat`) + Workers AI. Paginile sunt în `public/` (Build output directory), model `@cf/meta/llama-3.1-8b-instruct-fp8`. Cunoștințele sunt în `functions/api/_knowledge.js`, generate din catalog. `wrangler.jsonc` declară legătura `AI`. Inferența poate genera costuri Cloudflare.

## Prețuri
Prețul firmei = mijlocul intervalului observat pe piața din București, rotunjit. Sursele sunt listate pe pagina Ofertă.


## Eva Hybrid Search — FTS5/D1, fără întreruperea IDF

**Stare cod:** HIBRID (IDF + FTS5/BM25, fuziune RRF) este motorul implicit dacă indexul D1 este valid; IDF este fallback automat. Schema și importul sunt versionate. **Acest commit nu dovedește că baza D1 este migrată sau că Pages a fost redeployat.**

- Repository: `aipath512/CL4322B`; proiect Pages: `cl4322b`; configurare declarată: `wrangler.jsonc`, binding `DB` → `tcs-instal-cunostinte`.
- Sursa de adevăr: `functions/api/_knowledge.js`, nu indexul virtual. Căutarea FTS: `MATCH` + `bm25(k,3.0,1.0)`, tokenizer `unicode61 remove_diacritics 2`.
- **Nu se reindexează pe cererile chat**: `ensureIndex()` verifică doar hash-ul sursei. Dacă DB lipsește, schema e absentă ori hash-ul diferă, Eva revine la IDF.
- **HIBRID implicit**: la fiecare întrebare, dacă D1 are index valid și oferă rezultate, se execută IDF și FTS5 și se fuzionează clasamentele cu **RRF (k=60)**. Dacă D1 nu este disponibil / indexul este expirat / nu există potriviri FTS5, rămâne IDF. `SEARCH_ENGINE=idf` forțează rollback imediat la IDF.
- Jurnalizarea A/B este **opțională** (`FTS_AB_LOG=1`) pentru evitarea operațiunilor D1 de scriere la fiecare întrebare în mod implicit. Există tabelul `ab_log` pentru analize când este activată.
- Endpoint de stare: `GET /api/chat` — raportează `motor_preferat`, `motor_activ`, dimensiunea indexului FTS și statistici comparative sau eroarea de inițializare. Motorul efectiv este returnat și de răspunsurile chat (`engine`). Verificarea acestei adrese nu presupune activarea motorului nou.

### Activare controlată (operator Cloudflare)
1. Confirmați că proiectul **Pages cl4322b** și baza **tcs-instal-cunostinte** din `wrangler.jsonc` sunt în **același cont Cloudflare**. Nu creați o bază duplicată și nu suprascrieți date din alt cont.
2. Din checkout-ul repo-ului, rulați `npx wrangler d1 execute tcs-instal-cunostinte --remote --file=migrations/0001_eva_fts5.sql` pentru **schema nouă**. Dacă există deja tabelele, instrucțiunile `IF NOT EXISTS` le păstrează.
3. Generați fișierele de import: `node tools/build-fts5-seed.mjs`. Rezultă `dist/eva-fts5/chunk-NNN.sql` și `manifest.json`. **Reindexarea șterge doar conținutul indexului dedicat `k`**, nu informațiile din `_knowledge.js`.
4. Aplicați fișierele SQL în **ordinea numerică**, cu `npx wrangler d1 execute tcs-instal-cunostinte --remote --file=dist/eva-fts5/chunk-001.sql` și apoi pentru toate celelalte. Prima etapă invalidează hash-ul; ultima îl reactivează după importul complet. **Nu întrerupeți deliberat importul**; altfel FTS va fi indisponibil și IDF continuă să funcționeze.
5. Verificați `GET /api/chat`: `fts5.index` trebuie să coincidă cu `manifest.rows` și `fts5.hash` cu `manifest.hash`. Din momentul importului valid, **HIBRID devine implicit**. Testați pe întrebări reale și păstrați `SEARCH_ENGINE=idf` pregătit pentru rollback.
6. Dacă rezultatele nu sunt satisfăcătoare, setați `SEARCH_ENGINE=idf` în Pages pentru revenirea imediată. Pentru măsurare, setați opțional `FTS_AB_LOG=1`, respectând politica GDPR. Nu este necesar `FTS_ENABLE`.

### Măsurare și limite
- `ab_log.same` măsoară numai egalitatea **primului rând** IDF vs FTS, nu calitatea răspunsului sau satisfacția clientului.
- `ab_log` conține textul întrebărilor clienților (maxim 300 caractere) și fragmente din răspunsurile indexate. Revizuiți retenția, protecția datelor și accesul înainte de activarea jurnalizării la scară.
- Indexul FTS5 este **reconstruibil**; exportul D1 cu tabele virtuale poate avea limitări. Nu tratați DB ca singura copie a datelor.
- Pagina `public/intrebari.html` folosește în continuare căutarea client-side; nu a fost conectată la D1 în această etapă.
- D1 are costuri pentru citiri/scrieri și limitări de subrequest; **importul se rulează explicit**, niciodată în calea fiecărei întrebări.

### Decizie V1.1 — 8 noiembrie 2026
**HIBRID implicit cu fuziune RRF**, IDF automat ca fallback. Funcția `hybrid()` nu mai concatenează pur și simplu listele. Reindexarea rămâne în afara căii HTTP și se face doar prin import controlat. Disponibilitatea reală a binding-ului Cloudflare D1 și a indexului trebuie confirmată în deployment.
