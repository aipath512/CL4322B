# EVA-4322 — standalone MVP V0.1

This branch adds an independent Cloudflare Pages endpoint and one-script widget for CAEN 4322. **It does not modify the existing TCS INSTAL assistant.**

## Deploy / pilot
Configure the Cloudflare Pages environment variable `EVA_4322_TENANTS` with JSON, for example:

```json
{"firma01":{"origins":["https://client.example"],"name":"Asistent AI","phone":"+40...","qa":[{"id":"F01-1","question":"Lucrați sâmbăta?","answer":"Programul confirmat de firmă este ..."}]}}
```

Insert on an authorized site:

```html
<script src="https://YOUR-PAGES-DOMAIN/eva-4322-widget.js" data-tenant="firma01" defer></script>
```

Data is **not** automatically verified. The seed holds 10 general orientation Q&A, not 1,000; voice is not implemented. Do not advertise 1,000 validated answers or voice yet.

## API
`POST /api/eva-4322?tenant=firma01` with JSON `{"message":"..."}`. Rejects unauthorized Origin; no company data is guessed. The model is deterministic retrieval, pending hybrid FTS5/AI integration.

## Security
No unauthenticated write/admin endpoints. Browser Origin checks are a first safeguard, **not authentication**. For production, add distributed rate limiting, WAF, tenant-admin authentication, abuse protection, logging/retention rules and privacy reviews.

## Architecture
One shared CAEN-4322 knowledge set + per-tenant overlay, remotely served and editable through configuration without copying the widget or the standard KB. The full standalone project with automated tests, including the voice roadmap, is distributed separately as the EVA-4322 MVP package.

## EVA chat interface V0.3

The universal widget now opens at 380 x 540 pixels on desktop. Users may:
- Drag the browser-native resize grip (desktop, minimum 320 x 350).
- Maximize to the viewport and restore the prior size.
- Minimize without deleting the current conversation.
- Copy each message or the full transcript with the Clipboard API (HTTPS and permission required).
- Paste and edit multiline messages; Enter sends, Shift+Enter adds a line.
- Click a contextual follow-up chip; the chip sends a new question to the same tenant API.
- Reopen at the saved user-selected dimensions where browser local storage is available.

The API includes up to three follow-up questions, funnelStage (TOFU/MOFU/BOFU) and safe empty followups for unrecognized questions or gas emergencies.

These are deliberately lightweight deterministic follow-ups, **not yet a sophisticated AI conversational funnel using prior chat history**. The server currently processes each question independently. Voice is not available. 475 of the 485 candidate Q&A remain demonstration content requiring technical/commercial review. No Cloudflare publication is proven by GitHub tests alone.


## EVA V0.4 — conversational context (pilot)
The widget sends the last 8 prior messages from in-memory chat state (no server-side storage) with each new question. The shared endpoint accepts bounded context and recognizes a first contextual path: a visitor who asks which apartment boiler to choose and subsequently answers "Două băi" receives hot-water-flow guidance and two relevant next-step options.

**Scope:** this is a tested, deterministic contextual path, not general LLM multi-turn reasoning. It does not add voice or verified company pricing. The server trusts neither previous assistant text nor tenant-provided values as evidence for commercial commitments. Emergency phrases always take priority.

## V0.5 — Mobile/tablet/laptop company KB editor

A private admin screen is available at `/eva-4322-admin.html`. The owner and AiVenture representative can add and edit company-specific questions and answers during an in-person meeting. Every save creates a **draft** (including edits to previously published content). Press **Publică** after explicit owner confirmation; **Retrage** withdraws an answer. The public assistant retrieves **only published** company KB records.

### Production configuration (not automatically provisioned)

Create a **separate Cloudflare D1 database** for EVA company knowledge; do NOT use the existing TCS INSTAL demo `DB`. Bind this new database to the Pages project as `EVA_DB`, and apply `migrations/0002_eva_company_kb.sql` to it. Set these server-side environment variables:

- `EVA_4322_TENANTS`: JSON mapping tenant IDs to authorized website HTTPS origins.
- `EVA_4322_ADMIN_SHA256`: JSON mapping tenant IDs to SHA-256 hashes of independently generated random admin tokens of 24+ characters, e.g. `{"firma01":"<64 hex digits>"}`. Only the hash is configured server-side. Share actual secret with authorized administrator out of band.

The admin UI and API must run on the **same HTTPS host**. The UI keeps the bearer token in page memory (input field) only, without localStorage, cookies or query-string tokens. Rotate secrets if exposed. Add Cloudflare Access (or equivalent), WAF and distributed rate limiting before production use.

### Scope and safety

- Admin functions return 503 until `EVA_DB` and admin token configuration are present.
- Company records remain isolated by tenant ID; public visitors see only published records.
- Company updates do not change the standard CAEN 4322 KB.
- This MVP supports manual Q&A draft/edit/publish/unpublish; CSV/PDF imports and role-based multiuser admin are not yet available.
- Do not insert private customer data, passwords, invented prices or unsupported company claims.
- GitHub merge alone does not confirm Cloudflare deployment, database creation or tests on physical devices.

## V0.6 — Promoție parametrizabilă în Thank You

Administratorul poate seta o promoție per firmă în `/eva-4322-admin.html`: cod, titlu, procent 1–100 sau sumă fixă în RON/EUR (număr întreg), serviciu eligibil (opțional), dată început/sfârșit, condiții și activare/dezactivare.

Se aplică mai întâi `migrations/0003_eva_promotion_thankyou.sql` pe **EVA_DB dedicată**. Niciun tabel al TCS INSTAL nu este modificat. Valorile sunt stocate și evaluate server-side, după serviciu și data UTC.

Vizitatorul deschide din widget **Solicită ofertă**, completează serviciul, localitatea și contactul și acceptă contactarea. Serverul validează datele, salvează solicitarea în `eva_leads` și returnează referința și instantaneul promoției aplicabile. **Doar la status 201 confirmat** widgetul afișează Thank You și codul reducerii, explicit sub rezerva confirmării comerciale. Promoția nu este un cupon de plată și nu scade automat un preț.

Limitări de producție: endpointul public de lead necesită WAF/rate limiting, protecții anti-spam, reguli GDPR (notificare și retenție), notificarea operatorului/CRM și teste end-to-end Cloudflare. Momentan nu există interfață de vizualizare a leadurilor sau integrare CRM. **Nu activați public** înainte de aceste controale și de verificarea migrației. Nu sunt implementate automat taxe, plafoane de buget sau coduri unice per client.

## V0.7 — WhatsApp-inspired Light/Dark appearance

The EVA-4322 chat widget now has a sun/moon theme toggle in the top-right header. **Light is the default**; Dark is optional. The user's choice is stored locally per tenant and website in `eva4322:theme:<tenant>:<hostname>`. Theme changes never modify conversation history, user-selected window size, or the backend KB.

A custom, locally generated decorative line-art SVG pattern is used behind chat bubbles; no external image, screenshot, branding asset or tracking request is loaded. Light uses a light neutral canvas and pale green visitor bubbles. Dark uses charcoal canvas, dark green visitor bubbles and dark-gray assistant bubbles. Message copy, follow-up chips, offer form, mobile layout, fullscreen and desktop resizing inherit the selected palette.

No Cloudflare production deployment or physical-device visual acceptance has been confirmed by the GitHub test suite.
