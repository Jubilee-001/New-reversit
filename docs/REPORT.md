# ReverseIt customer-only redesign — report

## Summary

The app is now a customer-only complaint and deadline tracker for failed debits. All bank-side staff portal, voice, simulated behaviour, and unsupported claims have been removed. The frontend is a React 19 + Vite + Tailwind single-page app; the backend is the Python FastAPI app at `app/` exposing the real parser over HTTP plus the case state machine.

## What was deleted

- Go bank API (`cmd/api/`, `internal/`, `go.mod`, `go.sum`, `Dockerfile`)
- AI service (`cmd/aisvc/`, `aisvc.py`, `Dockerfile.ai`)
- Vue bank staff portal (`apps/bank/`)
- Voice input code and routes
- `DEMO-BANK`, seeded staff users, maker-checker, reconciliation, exceptions logic
- "Official Bank Credit Advice" modal, credit advice slip, provisional credit banners
- Simulated lifecycle stages, NIP-DEMO references, seeded demo cases
- Unsupported claims: "Zero hallucinations verified", "CBN Regulatory Compliance Certified", "Bank-Grade Encryption", "Local PII Redaction", "confidence percentages", "Template verified", etc.
- Voice languages (Hausa, Yoruba, Igbo, Pidgin), WhatsApp/Notification Hub

## What was added

**Backend (`app/`)**
- `data/deadlines.json`, `data/banks.json`, `data/escalation.json` — single source of truth, served at `GET /api/config`
- SQLAlchemy/SQLite case model with all required fields (no full account numbers)
- State machine: `draft_ready → sent → bank_replied → resolved/escalated`, with `resolved` final
- Case API: `POST /api/cases`, `GET /api/cases/{id}`, `PATCH`, `DELETE`, `mail-opened`, `confirm-sent`, `bank-reply`, `resolve`, `escalate`
- Deterministic complaint template (editable by the user)
- Per-IP rate limiting (10/min), 4 MB image cap, magic-byte validation, temp file deleted immediately
- Parser exposed over HTTP: `POST /api/parse-text`, `POST /api/extract-image-text`
- `.env.example` with `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_MAX_TOKENS`, `WEB_ORIGIN`

**Frontend (`apps/web/`)**
- React 19 + Vite + Tailwind 4, single-page app with History-API router
- Tailwind-only UI primitives: Button, Input, Label, Textarea, Select, Radio, Checkbox, Banner, ErrorSummary, StepIndicator, Layout
- 8 pages: `/`, `/start`, `/check`, `/problem`, `/complaint`, `/case/:id`, `/case/:id/escalate`, `/cases`
- Send flow: mail-opened call, mailto/Gmail builders with 1,800-char fallback + clipboard copy, return-prompt banner, countdown counted from confirm-sent, `.ics` reminder download
- Credit-alert warning on intake; manual entry always available
- Print stylesheet; `prefers-reduced-motion` support

## Decisions made

1. **Backend:** The brief anticipates a Go backend with a separate Python parser service. This repo ships a real Python FastAPI backend at `app/`, and the Go/AI code was bank-side only. I use the root Python FastAPI app as the single customer backend and import the parser in-process — one parsing path, one customer backend, no network hop. If a Go backend was intended instead, the parser becomes a separate FastAPI service.

2. **UI library:** shadcn-style Tailwind primitives, no Radix (offline-safe). One UI library only.

3. **Retention:** Cases are stored on the server until the customer deletes them (`DELETE /api/cases/{id}`). Stated on screen.

4. **ATM deadline:** 48 h shown for "ATM cash not dispensed" (bank never called late); note shows both 24 h on-us and 48 h not-on-us windows.

5. **Data:** No real customer data. Sample alerts are made-up and clearly labelled.

6. **GROQ_API_KEY:** Required for LLM fallback and screenshots; not committed. Rule-based parsing works without it for known banks in `regex_parser.py`. Missing key → clean failure message, manual entry always available.

## Data items marked `verified: false`

- `data/deadlines.json`: `failed_transfer`, `duplicate_debit`, `wrong_account`
- `data/banks.json`: `wema`
- `data/escalation.json`: tiers 1, 2, 3

## Parser sample run (section 11 inputs)

Ran `parse.py::parse_alert` on six made-up inputs **without `GROQ_API_KEY` set**. All six returned `could_not_parse`:

| Input | Reason |
|-------|--------|
| POS alert (ExampleBank) | Bank not in `KNOWN_BANKS` → regex returns `bank: Unknown` → LLM fallback needed → key missing |
| ATM alert (ThirdBank) | Same |
| Transfer alert, 12 Oct 2026 (FourthBank) | Same |
| 12-hour time 4:15 PM (AnotherBank) | Same |
| Balance line before debit (ExampleBank) | Same |
| Credit alert | Matches credit pattern → regex returns None → LLM fallback needed → key missing |

This is expected without `GROQ_API_KEY`. Manual entry is always available and the form pre-fills any parsed fields. With `GROQ_API_KEY` set, the LLM fallback would parse unknown banks too.

## How to run

Backend:
```
cd /home/gamp/reverseit
.venv/bin/uvicorn app.main:app --port 8000
```

Frontend:
```
cd /home/gamp/reverseit/apps/web
npm run dev        # dev server on :5173, proxies /api to :8000
npm run build      # production build
```

Tests:
```
cd /home/gamp/reverseit
.venv/bin/pytest -q                 # backend: 30 passed
cd apps/web
npm run typecheck                   # tsc -b
npm run lint                        # eslint
npm run test                        # vitest: 9 passed
```

## Known gaps

- No E2E test tool is configured in the repo (no Playwright/Cypress). Phase 6 asked for one "if the repo has an E2E tool" — it does not.
- No accessibility check tool (axe) is installed. Manual review at 360px/768px/1280px recommended.
- `GROQ_API_KEY` not set; parser LLM fallback unavailable for unknown banks.
- The frontend dev server proxies `/api` to `http://localhost:8000`; the backend must be running for full end-to-end use.

## Verification performed

- `pytest -q`: 30 passed (deadlines, state machine, config, parse API, banned-phrase scan)
- `npm run typecheck` (frontend): clean
- `npm run lint` (frontend): clean
- `npm run build` (frontend): clean
- `npm run test` (frontend): 9 passed (mailto/Gmail builders)
- Backend smoke test against running server: `/api/config` and `/api/parse-text` respond correctly
