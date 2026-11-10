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
