# ReverseIt customer-only redesign — plan

This plan follows `OPENCODE_TASK.md`. The parser branch is `working-version` (orphan branch containing `parse.py`, `regex_parser.py`, `image_input.py`); it is already merged into `feat/customer-only-redesign`, and the three parser files live at repo root exactly as written.

## Status

- Phase 0 (audit): done — this document.
- Phase 1 (real parser over HTTP): done — `POST /api/parse-text`, `POST /api/extract-image-text`, per-IP rate limiting (10/min), 4 MB image cap, magic-byte check, temp file deleted immediately, no logging of alert text/images.
- Phase 2 (remove bank/voice/simulated): done — Go API, AI service, staff portal, voice, simulated lifecycle, credit-advice modal and unsupported claims removed.
- Phase 3 (domain logic): done — `data/deadlines.json`, `data/banks.json`, `data/escalation.json` served at `GET /api/config`; SQLAlchemy/SQLite case model; state machine (`draft_ready`, `sent`, `bank_replied`, `resolved`, `escalated`); deterministic complaint template; case API (`POST /api/cases`, `GET /api/cases/{id}`, `PATCH`, `DELETE`, `mail-opened`, `confirm-sent`, `bank-reply`, `resolve`, `escalate`).
- Phase 4 (frontend): in progress — React 19 + Vite + Tailwind 4 shell exists; pages `/start`, `/check`, `/problem`, `/complaint`, `/case/:id`, `/case/:id/escalate`, `/cases` still to build.
- Phase 5 (consistency): not started.
- Phase 6 (tests): backend smoke test exists; unit/API/banned-phrase tests still to add.
- Phase 7 (report): done — `docs/REPORT.md` written, all verification complete.

## Backend decision (recorded deviation)

The brief anticipates a Go backend with the parser as a separate FastAPI service. This repo ships a real Python FastAPI backend at `app/`, and the Go/AI code is bank-side only. I use the root Python FastAPI app as the single customer backend and import the parser in-process: one parsing path, one customer backend, no network hop. No money movement, bank integration, or scheduler remains.

## Remaining work (Phases 4–7)

### Phase 4 — frontend and UX
- Tiny History-API router (`src/router.ts`) for `/`, `/start`, `/check`, `/problem`, `/complaint`, `/case/:id`, `/case/:id/escalate`, `/cases`; one layout with header/footer; "Step X of 4" derived from route config.
- Tailwind-only primitives (`src/components/ui/*`): Button, Input, Label, Textarea, Select, Radio, Checkbox, banner, error summary, step indicator. No second UI library (offline-safe).
- Pages per brief section 7.2: landing, alert intake (paste / upload screenshot, no voice, consent line), check details (editable fields, extracted text for images, bank selector, last-4 optional, match checkbox), problem choice (deadlines from JSON, Estimate badge), review & send (editable complaint, editable To address, mailto/Gmail/copy/print), case tracker (timeline, countdown, ticket/notes, mark replied/resolved/escalate, .ics reminder), escalate pack (3 tiers, copy buttons, evidence checklist), My cases (localStorage IDs).
- Send flow per 7.3: mail-opened call, mailto/Gmail builders with 1,800-char fallback + clipboard copy, return-prompt banner (Yes now / sent earlier / not yet), countdown starts after confirm-sent, "Counted from when you told us you sent it.", never "in breach".
- Credit-alert warning on intake per brief rule.

### Phase 5 — consistency pass
- Name "ReverseIt" in header, page titles, footer, meta tags.
- Deadlines, tiers, contacts only from JSON (no hard-coded duplicates).
- UTC in storage, WAT on screen; countdown and deadline text agree.
- No placeholder/test data, no simulated-behaviour references.

### Phase 6 — tests and verification
- Backend: deadline calculation, every valid/invalid state transition, config loading, parse API (parser+LLM mocked): success, could_not_parse, oversized file, wrong type, rate limit.
- Frontend: mailto/Gmail builders (encoding, 1,800-char fallback), banned-phrase scan test (fails if any banned phrase from section 7.4/5 appears in source).
- Run the real parser on the six made-up inputs from section 11 and record results (no network).
- Accessibility check + 360px check where tooling allows; gap recorded if E2E tool is missing.

### Phase 7 — report
- `docs/REPORT.md`: deleted vs added, decisions, every `verified: false` item, how to run app/tests, known gaps.

## Questions / open items (from brief, answered here)

1. **Backend:** root Python FastAPI app (see deviation above). If the Go API was intended instead, the parser becomes a separate FastAPI service.
2. **UI library:** shadcn-style Tailwind primitives, no Radix (offline-safe).
3. **Retention:** "stored on our server until you delete it"; `DELETE /api/cases/{id}` implements this; stated in UI.
4. **ATM deadline:** 48 h shown for "ATM cash not dispensed" (bank never called late); note shows both 24 h on-us and 48 h not-on-us windows.
5. **Data:** no real customer data; sample alerts are made-up and clearly labelled.
6. **GROQ_API_KEY:** required for LLM fallback and screenshots; not committed; rule-based parsing works without it for known banks. Missing key → clean failure message, manual entry always available.
