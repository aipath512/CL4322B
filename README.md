# CL4322B — site etalon CAEN 4322 (v1.1, 2026-11-08)

Site demonstrativ al unei firme **fictive** de instalații (încălzire, climatizare, sanitare) din București. Toate datele firmei și persoanele sunt fictive. Paginile au `noindex` și `robots.txt` blochează indexarea.

## Pagini
index, despre, servicii, produse, mentenanta, garantii, certificari, oferta, termeni, cookies, confidentialitate, ai-act.

## Asistent AI
`src/worker.js` (Cloudflare Worker: servește `public/` și răspunde pe `/api/chat`) + Workers AI, model `@cf/meta/llama-3.1-8b-instruct-fp8`. Cunoștințele sunt în `src/knowledge.js`, generate din catalog. `wrangler.jsonc` declară legătura `AI`. Inferența poate genera costuri Cloudflare.

## Prețuri
Prețul firmei = mijlocul intervalului observat pe piața din București, rotunjit. Sursele sunt listate pe pagina Ofertă.
