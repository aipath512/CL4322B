# TCS INSTAL (repo CL4322B) — site etalon CAEN 4322 (v1.2, 2026-11-08)

Site demonstrativ al unei firme **fictive** de instalații (încălzire, climatizare, sanitare) din București. Toate datele firmei și persoanele sunt fictive. Paginile au `noindex` și `robots.txt` blochează indexarea.

## Pagini
index, despre, servicii, produse, mentenanta, garantii, certificari, oferta, termeni, cookies, confidentialitate, ai-act.

## Asistent AI
`functions/api/chat.js` (Cloudflare Pages Function pe `/api/chat`) + Workers AI. Paginile sunt în `public/` (Build output directory), model `@cf/meta/llama-3.1-8b-instruct-fp8`. Cunoștințele sunt în `functions/api/_knowledge.js`, generate din catalog. `wrangler.jsonc` declară legătura `AI`. Inferența poate genera costuri Cloudflare.

## Prețuri
Prețul firmei = mijlocul intervalului observat pe piața din București, rotunjit. Sursele sunt listate pe pagina Ofertă.
