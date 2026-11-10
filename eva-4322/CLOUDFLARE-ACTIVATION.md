# EVA-4322 — Activare Cloudflare, fără atingerea bazei demonstrative

## Starea de pornire

GitHub conține widgetul, API-ul de chat, panoul mobil (`public/eva-4322-admin.html`), API-ul de administrare și migrarea `migrations/0002_eva_company_kb.sql`. **Codul GitHub nu este o dovadă de deploy Cloudflare.** Nu avem acces Cloudflare din această sesiune și nu am creat baze, secrete sau deploy-uri.

## 1. Identifică proiectul și contul corect

În Cloudflare Dashboard → Workers & Pages → proiectul `cl4322b`. Confirmă contul, ramura de producție, ultima versiune publicată, Pages Functions și configurația efectivă. Compară cu `wrangler.jsonc` din GitHub. Atenție: configurația Wrangler este sursă de adevăr pentru deploy dacă este prezentă; Cloudflare recomandă descărcarea configurației actuale înainte de schimbare: `npx wrangler pages download config cl4322b`. Nu suprascrie bindingurile existente.

## 2. Creează o bază separată, numai pentru EVA

Dashboard → Workers & Pages → D1 → Create database. Nume recomandat: `eva-4322-tenants`. Copiază **UUID-ul real al bazei**. Nu reutiliza baza `tcs-instal-cunostinte`, care aparține demo-ului TCS INSTAL.

Rulează migrarea pentru baza nouă (din checkout-ul repository-ului, cu Wrangler autentificat):

```bash
npx wrangler d1 execute eva-4322-tenants --remote --file=migrations/0002_eva_company_kb.sql
```

## 3. Configurează bindingul EVA_DB

Adaugă în Pages pentru mediul **production** bindingul `EVA_DB` spre noua bază D1. Pentru proiectele cu `wrangler.jsonc`, actualizează configurația de deploy și verifică păstrarea obligatorie a bindingului `DB` existent. Pentru a pregăti o variantă **locală necomisă** a fișierului Wrangler:

```bash
node tools/eva4322-preflight.mjs check
EVA_DB_ID='UUID-UL-REAL' EVA_DB_NAME='eva-4322-tenants' node tools/eva4322-preflight.mjs render
```

Rezultatul `wrangler.eva.generated.jsonc` este exclus din Git; comparați-l cu configurația Pages actuală înainte de activare. Nu comite un ID de alt cont și nu suprascrie bindingurile proiectului.

## 4. Configurează variabilele server-side

În Pages → Settings → Variables and Secrets (Production):

- `EVA_4322_TENANTS` (JSON): pentru fiecare firmă, `origins` conține numai domeniile HTTPS unde va fi instalat widgetul. Un tenant de pilot poate avea `{"firma01":{"origins":["https://firma-exemplu.ro"],"name":"EVA"}}`.
- `EVA_4322_ADMIN_SHA256` (secret JSON): `{"firma01":"SHA256_HEX_AL_CHEII_DE_ADMIN"}`. Utilizează token diferit pentru fiecare client. Nu expune valoarea tokenului real în repo sau în conversații.

Generare locală a perechii token / hash: `node tools/eva4322-preflight.mjs token`. **Nu rula în logurile CI**, fiindcă afișează tokenul în terminal. Tokenul se transmite privat reprezentantului și se introduce exclusiv în panoul de administrare. Doar hash-ul se introduce în Cloudflare.

Recomandat înainte de utilizarea pe clienți: Cloudflare Access pentru ruta administrativă, WAF/rate limiting și review privind GDPR. Verifică faptul că domeniul de admin și API-ul admin sunt pe aceeași origine HTTPS.

## 5. Deploy controlat

Dacă Pages este legat la GitHub, verifică mecanismul Git integration existent. Dacă faci un upload manual, confirmă mai întâi compatibilitatea cu acel proiect și configurația reală; apoi folosește comanda documentată Cloudflare, adaptată proiectului:

```bash
npx wrangler pages deploy public --project-name cl4322b --config wrangler.eva.generated.jsonc
```

Nu executa deploy-ul cu un config neverificat: ar putea înlocui alte bindinguri. Cloudflare necesită redeploy după schimbarea D1 bindingului sau a variabilelor.

## 6. Probe obligatorii

1. `GET /eva-4322-admin.html`: formularul se încarcă pe telefon, tabletă și laptop.
2. Autentificare cu `firma01`: se văd doar Q&A ale firmei.
3. Salvează Q&A de test ca **Draft**, apoi cere răspunsul de la widget: Q&A nou nu trebuie să fie vizibil.
4. Proprietarul confirmă informația; publică Q&A. Widgetul firmei trebuie să răspundă acum folosind Q&A aprobată.
5. Retrage Q&A; aceasta dispare din răspunsurile noi.
6. Testează cu al doilea tenant: nici drafturile, nici răspunsurile publicate ale firmei 1 nu trebuie să apară.
7. Testează o întrebare despre gaze: răspunsul de urgență trebuie să aibă prioritate și fără CTA de ofertare.
8. Testează desktop: redimensionare, fullscreen, COPY mesaj, COPY conversație și follow-up; mobil: input, scroll, butoane fără suprapunere.

## Blocaje vizibile

Fără drepturi Cloudflare nu pot completa baza D1, migrarea, variabilele și deploymentul din chat. Până atunci, accesul la panoul public poate afișa `503 Administrare neconfigurată`. Testele GitHub sunt pentru cod, nu confirmă efectuarea probelor live.
