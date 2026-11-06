# ReverseIt — Final Audit Report

Audit performed against OPENCODE_TASK.md Phases 0–7. Working tree is clean
(on `feat/customer-only-redesign`). All verification commands pass.

## [x] PASSED — fully matching spec

### Phase 0: Audit
- `docs/PLAN.md` written with phase breakdown and decisions recorded.

### Phase 1: Real parser over HTTP
- Parser branch (`working-version`) merged into `feat/customer-only-redesign`.
- Exactly one parsing path: `app/parser_adapter.py` re-exports `parse.py` /
  `regex_parser.py` / `image_input.py`.
- `parse.py::parse_alert(text)` returns
  `{amount, date, time, channel, bank, reference}` or
  `{error: "could_not_parse", missing: [...]}`.
- `image_input.py::extract_text_from_image(path)` -> text -> `parse_alert`.
- `POST /api/parse-text` and `POST /api/extract-image-text` in
  `app/parser_api.py`.
- Image flow: extract text, show to user for confirmation, then parse — never
  parse unconfirmed OCR automatically (`Start.tsx`).
- Per-IP rate limiting (10/min) in `app/rate_limit.py`.
- 4 MB image cap + magic-byte validation in `parser_api.py`.
- No logging of alert text or images.
- Clean failure message: "We couldn't read this right now..." (`PROVIDER_ERROR_MESSAGE`).
- Manual entry always available (`goManual()`).
- Credit-alert warning on intake (`isCreditAlert` check).
- `GROQ_API_KEY`, `GROQ_MODEL` (default qwen/qwen3.8-27b),
  `GROQ_MAX_TOKENS=400`, `GROQ_IMAGE_MAX_TOKENS=300`,
  `GROQ_REASONING_EFFORT` in `.env.example`.
- `groq`, `python-dotenv`, `fastapi` in `requirements.txt`.

### Phase 2: Removals (verified via repository-wide search — zero hits)
No hits for: staff portal, Operations Console, `/v1/auth/login`, voice/Whisper,
Hausa/Yoruba/Igbo/Pidgin, credit advice, provisional credit, zero customer
liability, zero hallucinations, bank-grade, real-time NIBSS, official bank credit
advice, NIP-DEMO, DEMO-BANK, Smart Reversal, simulated switch, maker-checker,
reconciliation, 8-check gate.
- Go API, Go AI service, Vue bank staff portal (`apps/bank/`), `cmd/`, `internal/`
  fully deleted (not commented out).
- `apps/web/` contains only customer pages; no operations portal.

### Phase 3: Domain logic
- `data/deadlines.json`, `data/banks.json`, `data/escalation.json` exist.
- `GET /api/config` serves all three via `app/config_loader.py::public_config()`.
- Frontend reads deadlines/tiers/contacts from JSON — zero hard-coded deadlines
  in UI (verified via search for `24 hours|48 hours|72 hours|disputes@|cpd@`).
- SQLAlchemy/SQLite case model (`app/models.py`) with all required fields;
  only `account_last4` (max 4 digits) stored.
- Case id = 256-bit entropy (`secrets.token_urlsafe(32)`).
- Statuses: `draft_ready`, `sent`, `bank_replied`, `resolved`, `escalated`.
- State machine transitions enforced in `app/case_service.py`:
  `draft_ready -> sent -> bank_replied -> resolved/escalated`; `resolved` is
  final; escalate tier 1/2/3 only.
- `deadline_at = sent_at + window_hours`; UTC storage, WAT display
  (`app/timeutil.py`, `apps/web/src/lib/dates.ts`).
- No user accounts; case id is access key.
- My cases in `localStorage` (`apps/web/src/lib/storage.ts`, `Cases.tsx`).
- All case API endpoints implemented (`cases_api.py`):
  POST `/api/cases`, GET/PATCH/DELETE `/api/cases/{id}`,
  mail-opened, confirm-sent, bank-reply, resolve, escalate.
- Deterministic complaint template (`app/complaint.py`) with bank name,
  date/time, amount, channel, reference, last4, problem type, timeline
  request, acknowledgement request, escalation line.
- Tiers 1–3 with pre-written messages in `data/escalation.json`.

### Phase 4: Frontend and UX
- React 19 + Vite + Tailwind 4; single-page app with History-API router
  (`router.ts`).
- Tailwind-only UI primitives (Button, Input, Label, Textarea, Select, Radio,
  Checkbox, Banner, ErrorSummary, StepIndicator, Layout) — no second UI library.
- 8 pages: `/`, `/start`, `/check`, `/problem`, `/complaint`,
  `/case/:id`, `/case/:id/escalate`, `/cases`.
- "Step X of 4" from route config (`router.ts`).
- GOV.UK-inspired patterns: question pages, ErrorSummary, Banner notification.
- Neutral styling: no gradients, glow, emojis, or fake badges (verified in CSS
  and all components).
- Mobile-first; `max-w-3xl` container; `text-[var(--*)]` tokens.
- Send flow: mail-opened call, mailto/Gmail builders with 1,800-char fallback
  + clipboard copy (`mailto.ts`).
- Return-prompt banner on mount + visibilitychange/focus/pageshow (`Complaint.tsx`).
- Countdown starts after confirm-sent; "Counted from when you told us you sent it."
- Never says "in breach" (`CaseView.tsx`).
- ".ics reminder download" (`CaseView.tsx::addReminder`).
- Print stylesheet; `prefers-reduced-motion` support (`index.css`).

### Phase 5: Consistency pass
- App name "ReverseIt" in header, page titles, footer, meta tags.
- Deadlines, tiers, contacts only from JSON.
- UTC storage / WAT display throughout.
- No placeholder/test data; sample alerts clearly labelled as made-up.
- No simulated-behaviour references.

### Phase 6: Tests and verification
- Backend: 30 tests pass (`tests/test_backend.py`) covering deadline
  calculation, all valid/invalid state transitions, config loading, parse API
  (parser+LLM mocked), oversized file, wrong type, rate limit.
- Frontend: 9 tests pass (`apps/web/src/tests/mailto.test.ts`) covering
  mailto/Gmail builders, encoding, 1,800-char fallback.
- Banned-phrase scan test (`tests/test_banned_phrases.py`) passes — zero banned
  phrases in source code.
- `npm run typecheck` clean; `npm run lint` clean; `npm run build` clean.
- `.venv/bin/pytest -q` clean.

### Phase 7: Report
- `docs/REPORT.md` written: deleted vs added, decisions,
  `verified: false` items, run instructions, known gaps.

## [ ] MISSING / INCOMPLETE

| # | File | Gap | Required action |
|---|------|-----|-----------------|
| 1 | `apps/web/src/pages/Cases.tsx` | `DELETE /api/cases/{id}` exists in API but no UI button to delete a case. Brief says cases are "stored on our server until you delete it." | Add a delete button per row in the Cases table calling `deleteCase(id)`. |
| 2 | (none) | No E2E test tool configured (no Playwright/Cypress). Brief says "If the repo has an E2E tool, add one happy-path test." | N/A — repo lacks E2E tooling. Documented as gap in `docs/REPORT.md`. |
| 3 | (none) | No accessibility check tool (axe) installed. | N/A — tooling absent. Documented as gap in `docs/REPORT.md`. |
| 4 | (none) | No 360px viewport testing tooling. | N/A — tooling absent. Documented as gap in `docs/REPORT.md`. |
| 5 | `apps/web/src/pages/CaseEscalate.tsx` | Fetches `/api/config` with raw `fetch()` instead of the `getConfig()` helper used elsewhere. | Minor inconsistency; replace with `getConfig()` for consistency. |
| 6 | `apps/web/src/pages/Problem.tsx` | `resolveDeadline()` duplicates backend deadline-selection logic from `config_loader.py`. | Acceptable for frontend display, but must only read from JSON (which it does). No action needed unless backend logic changes. |

## Verification commands (all pass)
- `.venv/bin/pytest -q` — backend: 30 passed
- `cd apps/web && npm run typecheck` — clean
- `cd apps/web && npm run lint` — clean
- `cd apps/web && npm run test` — frontend: 9 passed
- `cd apps/web && npm run build` — clean
- Repository-wide banned-term search — zero hits
