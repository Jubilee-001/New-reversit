# ReverseIt customer-only redesign — plan

This plan follows `OPENCODE_TASK.md`. The parser branch is `working-version` (unmerged, orphan branch containing `parse.py`, `regex_parser.py`, `image_input.py`).

## Phase 0 — audit findings

### What the repo actually contains

There are three backends and one frontend:

| Area | Path | What it is |
| --- | --- | --- |
| Python FastAPI | `app/` | Small ReverseIt dispute API with SQLAlchemy/SQLite. Hard-coded regex parser (`app/parser.py`), hard-coded channel deadlines (`app/deadlines.py`), letter templates (`app/letters.py`), APScheduler job. This is the only backend that is Python and can host the parser in-process. |
| Go API | `apps/api/` | Large bank-side operations backend (Chi, Postgres, Redis). Contains the Operations Console API, staff auth, maker-checker, reconciliation, exceptions, investigations, reversals, audit, simulator, `DEMO-BANK` seeds, alert parsing (`internal/alertparse`). |
| Python AI service | `apps/ai-service/` | Bank-side AI/ML service: anomaly detection, complaint matching, copilot, `regex_parser.py`, confidence scoring, governance. |
| React frontend | `apps/web/` | React 19 + Vite + Tailwind 4 single-page app. One customer portal (`features/reverseit/ReverseItView.tsx`) plus the full bank Operations Console, staff login, voice dispute intake and mock simulator. |

Root orchestration (`dev-all.mjs`, `migrate.mjs`, `compose.yaml`, `render.yaml`, `railway.json`, `infra/`, `packages/`, `.github/workflows/*`) is built around the Go/Postgres/Redis monorepo.

Root `app/` is a real, working Python FastAPI app (`tests/test_main.py`, `tests/test_backend.py`). The React app does not call it today: `apps/web/src/services/apiClient.ts` uses mock/simulator data and `/v1` Go endpoints.

### Files/components/routes to delete (Phase 2)

**Bank staff portal / Operations Console**
- `apps/web/src/features/DashboardView.tsx`, `AgentIntakeView.tsx` and `features/agent/*`
- `features/exceptions/*`, `ExceptionsView.tsx`
- `features/reconciliation/*`, `ReconciliationView.tsx`
- `features/investigations/*`, `InvestigationsView.tsx`
- `features/reversals/*`, `ReversalsView.tsx`
- `features/audit/*`, `AuditView.tsx`
- `features/rules/*`, `RulesAndHealthView.tsx`
- `features/reports/*`, `ExecutiveReportsView.tsx`
- `features/models/*`, `ModelDriftAndShadowView.tsx`
- `features/fraud/*`, `features/auth/StaffLoginView.tsx`
- `features/StorybookView.tsx`, `TransactionsView.tsx`
- `shell/AppShell.tsx`, `context/*`, `components/*` (bank widgets)
- Whole Go bank backend `apps/api/` (operations routes, `/v1/auth/login`, maker-checker, reconciliation, exceptions, investigations, reversals, audit, simulator, `DEMO-BANK`, `NIP-DEMO` test fixtures)
- Whole bank AI service `apps/ai-service/`
- `packages/api-contracts/`, `packages/ui/`
- Bank architecture/runbook docs under `docs/adr`, `docs/architecture`, `docs/backend`, `docs/financial-integrity`, `docs/runbooks`, `docs/security`

**Voice**
- `apps/web/src/features/reverseit/voice/*` (`VoiceDisputeModal.tsx`, `VoiceDisputeEngine.ts`, `VoiceEngineManager.ts`, `VoiceEngineSettingsModal.tsx`)
- all voice buttons/cards in `ReverseItView.tsx`, `S1ReportProblem.tsx`, `S2PasteUpload.tsx`
- `scripts/generate_audio_prompts.py`, `apps/web/public/audio/*`
- voice tests (`multilingual-voice-intake.test.ts`, `voice-engine-manager.test.ts`)
- voice env vars / multilingual copy

**Simulated or fake**
- `CreditAdviceReceiptModal.tsx` (Official Bank Credit Advice, provisional credit, print/PDF)
- `PizzaTrackerStepper.tsx` (simulated lifecycle, Re-check Switch Status)
- `CustomerNotificationHub.tsx` (WhatsApp/SMS Notification Hub)
- provisional-credit / zero-liability / guaranteed banner in `S8CaseTracker.tsx`
- bank-target / accelerated timers and simulated stages in `reverseitData.ts`
- satisfaction rating, hash/QR/sealed claims
- seeded `INITIAL_CUSTOMER_CASES` (`NIP-DEMO`)
- `services/mockSimulatorData.ts`, simulator fallbacks in `services/apiClient.ts`

**Unsupported claims**
- `Zero Hallucinations Verified`, `CBN Regulatory Compliance Certified`, `Enterprise Settlement Platform`, `Bank-Grade Encryption`, `Local PII Redaction`, `account numbers masked on your device`, automated balance redaction, parser confidence percentages, `Template verified`.

### What we keep / add

- Keep the three parser files from `working-version` exactly as written, at repo root: `parse.py`, `regex_parser.py`, `image_input.py`, plus `alert_samples.md`. They are the single parsing path.
- Keep and rewrite `app/` as the customer-only FastAPI backend. Add `app/config_loader.py`, `app/case_service.py`, `app/complaint.py`, `app/rate_limit.py`, and JSON config under `data/`.
- Keep `apps/web` but replace its source with a customer-only React app.
- Keep `data/sample_alerts/samples.json` only as clearly-labelled made-up examples (routed through the real parser).
- Keep `.env.example`, rewrite it for this app.

### Parser public functions (confirmed from `working-version`)

- `parse.py`: `parse_alert(text: str) -> dict`, `parse_screenshot(path: str) -> dict`
- `regex_parser.py`: `parse_with_regex(text: str) -> dict | None`
- `image_input.py`: `extract_text_from_image(path: str) -> str | None`
- Result contract: success `{amount, date, time, channel, bank, reference}`; failure `{error: "could_not_parse", missing: [...]}`. `channel` ∈ `atm|pos|transfer|web`, `bank` may be `"Unknown"`.

## Backend decision (deviation from the brief, recorded here)

The brief anticipates a Go backend and says to run the parser as a separate FastAPI service in that case. This repo also ships a real Python FastAPI backend at `app/`. To get exactly one parsing path and one customer backend, I am:

1. deleting the bank-only Go API and AI service (they are the bank/operations product, not the customer product), and
2. making the root Python FastAPI app the customer backend, importing the parser in-process.

Why: the product has no bank side, the Python app already exists, and an in-process parser removes an entire network hop and keeps the parser as the single source of truth. No money movement, bank integration, or background scheduler remains.

## Parser exposure (Phase 1)

- `POST /api/parse-text` with `{text}` → `parse_alert(text)`.
- `POST /api/extract-image-text` (multipart `file`) → `{text}` or a clean error. Server-side checks: png/jpg/jpeg/webp only, max 4 MB, magic-byte sniff, temp file deleted immediately. The image flow in the UI always shows the extracted text for the user to confirm/edit before parsing.
- Per-IP in-memory rate limit, 10 requests/minute on both endpoints. Bounded request size. No alert text or image ever logged.
- On provider failure/429/timeout the API returns a stable error code and the UI shows: “We couldn’t read this right now. Try again in a minute, or type the details yourself.”
- Manual entry is always available; parse failures return the form with found fields prefilled and missing fields highlighted.
- Credit-alert warning in the UI uses the exact rule in the brief.

## Data / domain (Phase 3)

- `data/deadlines.json`, `data/banks.json`, `data/escalation.json`; served at `GET /api/config`. No deadlines, emails or tiers hard-coded in the frontend.
- SQLite via SQLAlchemy. Case `id` is `secrets.token_urlsafe(32)` (256 bits). Times stored UTC; displayed WAT in the UI.
- Statuses: `draft_ready`, `sent`, `bank_replied`, `resolved`, `escalated`. `overdue` is derived. Invalid transitions return a clear 409.
- Deterministic complaint template in `app/complaint.py`.
- Additional endpoint beyond the brief: `PATCH /api/cases/{id}` to persist edits to `complaint_text`/`to_email`, and `DELETE /api/cases/{id}` so the privacy text (“stored until you delete it”) is true.

## Frontend (Phase 4)

- Keep React 19 + Vite + Tailwind 4, already in the repo. No second UI library is added. shadcn/ui is not installed and the environment may be offline, so I add a small shadcn-style primitive set (`components/ui/*`, `components.json`) built on the existing Tailwind tokens instead of hand-rolling page styles. This keeps one foundation.
- Tiny History-API router (no new dependency) for `/`, `/start`, `/check`, `/problem`, `/complaint`, `/case/:id`, `/case/:id/escalate`, `/cases`.
- GOV.UK-style question pages, error summary, check-your-answers, notification banner, confirmation patterns.
- Neutral off-white/near-black, one calm teal accent; red/amber/green only for status and never alone.
- Mobile-first (360/768/1280), 44 px targets, visible focus, reduced-motion honoured, countdown updated once a minute and not `aria-live`.

## Questions / open items

1. **Which backend did you mean?** The repo has three. I chose the root Python FastAPI app and deleted the Go/AI bank services. If you wanted to keep the Go API, the parser would instead be a separate FastAPI service. This is the safest reading of “customer-only” because the Go/AI code is almost entirely bank-side.
2. **shadcn/ui** is not present and no network is assumed. I am using shadcn-style Tailwind primitives rather than adding Radix packages. If network is available and you want real shadcn, we can swap the primitives without changing pages.
3. **Data retention** is undecided in the brief. I am implementing “stored on our server until you delete it”, with a delete action, and saying exactly that in the UI. Change the retention policy if you meant something else.
4. **ATM deadline** has two CBN rows (24 h on-us, 48 h not-on-us) but the requested UI has one ATM option. I use 48 h (so a bank is never called late) and show both windows in the note. **Duplicate debit** uses the channel window; it is marked unverified for transfers.
5. `apps/web` E2E specs exist but Playwright is not installed or configured. I will not add a new E2E tool; backend/unit tests cover the flow and the gap is recorded in the final report.

## Execution order

1. Phase 0: this document (commit).
2. Phase 1: merge `working-version` parser files, rewrite `app/` parsing path + HTTP endpoints, env/requirements (commit).
3. Phase 2: delete bank/voice/simulated frontend and backend code; keep a minimal runnable customer shell (commit).
4. Phase 3: JSON config, case model/state machine, complaint template, API (commit).
5. Phase 4: full customer frontend and send flow (commit).
6. Phase 5: consistency pass, remove leftover placeholder/simulated copy (commit).
7. Phase 6: tests incl. banned-phrase scan and parser sample run (commit).
8. Phase 7: `docs/REPORT.md` and summary (commit).
