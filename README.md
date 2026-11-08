# TCS INSTAL (repo CL4322B) — site etalon CAEN 4322 (v1.2, 2026-11-08)

Site demonstrativ al unei firme **fictive** de instalații (încălzire, climatizare, sanitare) din București. Toate datele firmei și persoanele sunt fictive. Paginile au `noindex` și `robots.txt` blochează indexarea.

## Pagini
index, despre, servicii, produse, mentenanta, garantii, certificari, oferta, termeni, cookies, confidentialitate, ai-act.

## Asistent AI
`functions/api/chat.js` (Cloudflare Pages Function pe `/api/chat`) + Workers AI. Paginile sunt în `public/` (Build output directory), model `@cf/meta/llama-3.1-8b-instruct-fp8`. Cunoștințele sunt în `functions/api/_knowledge.js`, generate din catalog. `wrangler.jsonc` declară legătura `AI`. Inferența poate genera costuri Cloudflare.

## Prețuri
Prețul firmei = mijlocul intervalului observat pe piața din București, rotunjit. Sursele sunt listate pe pagina Ofertă.


## Eva Hybrid Search — FTS5/D1, fără întreruperea IDF

**Stare cod:** motorul IDF rămâne activ și este fallback; FTS5 este comparat în paralel dacă indexul D1 este sincronizat. Schema și importul sunt versionate. **Acest commit nu dovedește că baza D1 este migrată sau că Pages a fost redeployat.**

- Repository: `aipath512/CL4322B`; proiect Pages: `cl4322b`; configurare declarată: `wrangler.jsonc`, binding `DB` → `tcs-instal-cunostinte`.
- Sursa de adevăr: `functions/api/_knowledge.js`, nu indexul virtual. Căutarea FTS: `MATCH` + `bm25(k,3.0,1.0)`, tokenizer `unicode61 remove_diacritics 2`.
- **Nu se reindexează pe cererile chat**: `ensureIndex()` verifică doar hash-ul sursei. Dacă DB lipsește, schema e absentă ori hash-ul diferă, Eva revine la IDF.
- Căutare FTS / hibridă experimentală: parametrul `engine: "fts"` sau `"hybrid"` este acceptat doar când `FTS_ENABLE=1`. În absența acestei variabile, IDF rămâne motorul selectat; rezultatele primare se pot compara în tabelul `ab_log`.
- Endpoint de stare: `GET /api/chat` — raportează `motor_activ: "idf"`, dimensiunea indexului FTS și statistici comparative sau eroarea de inițializare. Verificarea acestei adrese nu presupune activarea motorului nou.

### Activare controlată (operator Cloudflare)
1. Confirmați că proiectul **Pages cl4322b** și baza **tcs-instal-cunostinte** din `wrangler.jsonc` sunt în **același cont Cloudflare**. Nu creați o bază duplicată și nu suprascrieți date din alt cont.
2. Din checkout-ul repo-ului, rulați `npx wrangler d1 execute tcs-instal-cunostinte --remote --file=migrations/0001_eva_fts5.sql` pentru **schema nouă**. Dacă există deja tabelele, instrucțiunile `IF NOT EXISTS` le păstrează.
3. Generați fișierele de import: `node tools/build-fts5-seed.mjs`. Rezultă `dist/eva-fts5/chunk-NNN.sql` și `manifest.json`. **Reindexarea șterge doar conținutul indexului dedicat `k`**, nu informațiile din `_knowledge.js`.
4. Aplicați fișierele SQL în **ordinea numerică**, cu `npx wrangler d1 execute tcs-instal-cunostinte --remote --file=dist/eva-fts5/chunk-001.sql` și apoi pentru toate celelalte. Prima etapă invalidează hash-ul; ultima îl reactivează după importul complet. **Nu întrerupeți deliberat importul**; altfel FTS va fi indisponibil și IDF continuă să funcționeze.
5. Verificați `GET /api/chat`: `fts5.index` trebuie să coincidă cu `manifest.rows` și `fts5.hash` cu `manifest.hash`. Faceți test A/B pe întrebări reale; nu modificați `FTS_ENABLE` încă.
6. Comutatorul `FTS_ENABLE` este versionat în `wrangler.jsonc` (`vars`). **Stare 8 nov 2026: `"1"` — decizie owner: motorul implicit este hibrid** (FTS5 ordonează primele 10 rânduri, IDF completează și preia singur dacă indexul lipsește sau e învechit). Rollback: `"0"` + commit. Cereri de test: `engine: "idf"` / `"fts"`.

### Măsurare și limite
- `ab_log.same` măsoară numai egalitatea **primului rând** IDF vs FTS, nu calitatea răspunsului sau satisfacția clientului.
- `ab_log` conține textul întrebărilor clienților (maxim 300 caractere) și fragmente din răspunsurile indexate. Revizuiți retenția, protecția datelor și accesul înainte de activarea jurnalizării la scară.
- Indexul FTS5 este **reconstruibil**; exportul D1 cu tabele virtuale poate avea limitări. Nu tratați DB ca singura copie a datelor.
- Pagina `public/intrebari.html` folosește în continuare căutarea client-side; nu a fost conectată la D1 în această etapă.
- D1 are costuri pentru citiri/scrieri și limitări de subrequest; **importul se rulează explicit**, niciodată în calea fiecărei întrebări.
