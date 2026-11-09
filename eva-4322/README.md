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
