# Task brief for the coding agent: ReverseIt customer-only redesign

You are working on **ReverseIt**, a web app that helps Nigerian bank customers file and track a complaint when a debit fails. Read this whole brief before touching any code. Write your plan to `docs/PLAN.md`, then execute phase by phase. Keep the app runnable after every phase and commit after each one. Placeholders in \[square brackets\] are for the human to fill in or for you to discover in the repo.

## 1. What the product is, and is not

The customer pastes a debit alert (text) or uploads a screenshot. The app extracts amount, date, time, channel, bank and reference. The customer confirms them and says what went wrong. The app shows the CBN deadline for that problem, drafts a formal complaint, and helps the customer email it to their bank from their own email account. The customer then confirms they sent it, and the app tracks the deadline and shows how to escalate if the bank stays silent.

It is **not** a bank tool. It never moves money, never promises a refund, has no bank or NIBSS integration, and has no bank-side portal. Anything on screen or in code that implies otherwise must be removed.

The app name is **ReverseIt** everywhere. Replace every use of “Smart Reversal”. \[Human: change this if you prefer the other name.\]

## 2. Ground rules

- Work on a new branch from main called `feat/customer-only-redesign`. Never commit to main. Commit after each phase with a clear message.
- Never commit secrets. `.env` stays ignored. Keep `.env.example` current.
- Do not invent facts. No made-up email addresses, phone numbers, statistics, confidence scores or CBN rules. If data is unknown, leave it empty or mark it `verified: false`, and show that in the UI.
- Delete dead code instead of commenting it out.
- If this brief conflicts with what you find in the repo, note it in `docs/PLAN.md` under “Questions”, choose the safest option, and continue. Ask the human only when blocked.
- Priority order if time runs short: Phases 0 to 2 first (they make the demo safe), then Phase 3, then Phase 4. Each phase must leave a working app.

## 3. Phase 0: audit (no code changes)

- Inspect the repo: frontend framework, backend language, how parsing is done today (main uses hard-coded parsing and preset alerts), routes, data models, seeded demo data.
- List every file, route, component, endpoint, model, seed and env var that belongs to: (a) the bank staff portal or Operations Console, (b) voice input, (c) simulated bank or switch behaviour, (d) fake documents and unsupported claims (section 5).
- Locate the parser branch: \[PARSER\_BRANCH\]. It holds three Python files: `parse.py`, `regex_parser.py`, `image_input.py`. Confirm their public functions.
- Write `docs/PLAN.md` with findings, what you will delete, what you will keep, how the Python parser will be exposed, and any questions.

## 4. Phase 1: bring in the real parser

- Merge \[PARSER\_BRANCH\] into your branch. On conflicts, the parser branch wins for all parsing logic.
- Delete the hard-coded and preset-based parsing on main. There must be exactly one parsing path.
- Use these functions: `parse_alert(text) -> dict`, `extract_text_from_image(path) -> str | None`, `parse_screenshot(path) -> dict`. A result is either `{amount, date, time, channel, bank, reference}` or `{error: "could_not_parse", missing: [...]}`. `channel` is one of atm, pos, transfer, web. `bank` may be `Unknown`.
- Expose them over HTTP. If the backend is Go, keep the parser as a small separate Python service (FastAPI) and say why. Endpoints:
  - `POST /api/extract-image-text` (multipart image) returns `{text}` or an error. Accept png, jpg, jpeg, webp only, max 4 MB, checked server-side.
  - `POST /api/parse-text` with `{text}` returns the `parse_alert` result.
- The image flow has two steps: extract text, show it to the user to confirm or edit, then parse. Never parse unconfirmed OCR text automatically.
- Environment variables: `GROQ_API_KEY`, `GROQ_MODEL` (default `qwen/qwen3.8-27b`), `GROQ_MAX_TOKENS=400`, `GROQ_IMAGE_MAX_TOKENS=300`, optional `GROQ_REASONING_EFFORT`. Document them in `.env.example`. Add `groq`, `python-dotenv` and the web framework to requirements.
- The free Groq tier has a low per-minute output-token limit. Add per-IP rate limiting on both endpoints (for example 10 per minute), cap request size, and never log alert text or images. On provider errors (429, timeout) return a clean failure and show: “We couldn’t read this right now. Try again in a minute, or type the details yourself.”
- Always offer manual entry. If parsing fails or fields are missing, show the form with found fields prefilled and missing ones highlighted.
- Add a frontend warning when the text looks like a credit alert (contains credit, credited or received, and no debit, debited, Dr or withdrawal): “This looks like money received, not a debit. ReverseIt is for debits that went wrong.”

## 5. Phase 2: remove

Delete code, routes, nav links, seeds, tests and copy for all of the following.

**Bank side:** the “Bank Staff Portal” button and link; the whole Operations Console and every tab (Dashboard, Agent Complaint Intake, Reconciliation, Exceptions, Investigations, Maker-Checker Reversals, Immutable Audit Trail, Rules & Integration Health, Executive Reports, ML Drift & Shadow Matrix, Design System); the staff login (and `/v1/auth/login` if only staff use it); seeded staff users and `DEMO-BANK`; maker-checker, reconciliation and exceptions logic and models; “Simulated Switch Feed”; Notification Hub (WhatsApp/SMS); the Core API Gateway status chip.

**Voice:** all Voice Dispute buttons and the landing card; routes; Whisper or transcription code; related env vars; every mention of Hausa, Yoruba, Igbo, Pidgin voice or “multilingual voice AI”.

**Simulated or fake:** the “Official Bank Credit Advice” modal and the “Credit Advice Slip” button, with its print and PDF download; the provisional credit, “zero customer liability” and “funds fully guaranteed” banner; bank-target and accelerated 2-hour timers; simulated lifecycle stages (Switch Interrogation, Reconciliation & Safety Audit, Ledger Reversal & Credit); “Re-check Switch Status”; “AI suggestion from switch telemetry”; Case Investigation Audit Trail and “8-Check Gate”; the satisfaction rating; hash, QR and “cryptographically sealed” claims; seeded demo cases (including `NIP-DEMO` references) in the cases list.

**Unsupported claims:** “Zero hallucinations verified”; “CBN Regulatory Compliance Certified”; “Enterprise Settlement Platform”; “Bank-Grade Encryption”; “Local PII Redaction”; “account numbers masked on your device”; “automated balance redaction”; confidence percentages (the parser produces none); “Template verified”.

Keep “Try an example” buttons only if they are clearly labelled as samples and run through the real parser. Use made-up alerts, never real customer data.

After deleting, the app must build, with no dead imports or unused routes.

## 6. Phase 3: domain logic

### 6.1 Data files (single source of truth)

Create JSON files loaded by the backend and served at `GET /api/config`. The frontend reads from there and never hard-codes deadlines, emails or tiers.

- `deadlines.json`: one entry per problem type with `window_hours`, `label`, `verified`, `source`, `note`. Starting values are in section 11. Whenever `verified` is false, the UI shows an “Estimate” badge. The UI always shows the source and “Check the latest CBN circulars.”
- `banks.json`: `key`, `name`, `dispute_email`, `phone`, `source_url`, `verified`, `verified_on`. Do not invent any entry. Copy existing addresses from the repo and set `verified: false`. For any bank without an entry, the user types the address themselves. When `verified` is false, show “Check this address on your bank’s website before sending.” The To address is always editable.
- `escalation.json`: the three tiers in section 11, each with contacts, when to use it, and a `verified` flag.

### 6.2 Case model and state machine

Fields: `id` (random, unguessable, at least 128 bits), `created_at`, `problem_type`, `channel`, `bank_key`, `bank_name`, `amount`, `txn_date`, `txn_time`, `reference`, `account_last4` (optional, user-entered), `complaint_text`, `to_email`, `status`, `sent_at`, `sent_at_source` (`confirmed_now` or `user_entered`), `deadline_at`, `bank_ticket`, `notes`, `resolved_at`, `escalated_at`, `escalation_tier`. Never store a full account number.

Statuses: `draft_ready`, `sent`, `bank_replied`, `resolved`, `escalated`. “Overdue” is derived, not stored: now is later than `deadline_at` and the case is not resolved.

Transitions:

- create gives `draft_ready`, with no deadline and no countdown.
- `draft_ready` to `sent` happens only through confirm-sent. `sent_at` must not be in the future (allow 2 minutes of tolerance) and must not be before `created_at`.
- `sent` to `bank_replied` takes an optional ticket number and note.
- `sent` or `bank_replied` to `resolved`, and any non-resolved status to `escalated` (with the tier). `resolved` is final.
- `deadline_at = sent_at + window_hours`. If the problem type has no deadline (wrong account), `deadline_at` is null and the UI explains why.
- Store all times in UTC and display in Africa/Lagos (WAT).

There are no user accounts. The case link is the access key, and “My cases” lists the case IDs saved in the browser’s local storage. Say so on screen.

### 6.3 API (adapt to the existing backend)

`GET /api/config`, `POST /api/cases`, `GET /api/cases/{id}`, `POST /api/cases/{id}/mail-opened`, `POST /api/cases/{id}/confirm-sent` (`{sent_at?}`), `POST /api/cases/{id}/bank-reply` (`{ticket?, note?}`), `POST /api/cases/{id}/resolve`, `POST /api/cases/{id}/escalate` (`{tier}`). Reject invalid transitions with a clear error.

### 6.4 Complaint text

Generate the complaint with a deterministic template from the confirmed fields, never from free-form AI output. It contains: the bank name; the transaction date and time; amount; channel; reference; account last 4 digits only if the user gave them; the problem type in plain words; a request to reverse or correct it within the stated timeline, naming the source in `deadlines.json`; a request for acknowledgement and a ticket number within 3 days; and a polite line that the customer may escalate to the CBN Consumer Protection Department if it is not resolved in time. The customer can edit the text before sending.

## 7. Phase 4: frontend and UX

### 7.1 Design rules (must not look generated)

- Use one established component foundation instead of hand-rolling styles. If the frontend is React, use shadcn/ui (Radix + Tailwind) with its neutral theme. Otherwise keep the library already in the repo. Do not add a second UI library.
- Borrow interaction patterns from the GOV.UK Design System: question pages, error summary, check-your-answers, notification banner, confirmation page. Adapt the patterns. Do not copy their branding.
- One typeface (system UI stack or Inter). Body text at least 16px, line length 60 to 75 characters, a simple type scale, and a 4/8px spacing scale.
- Neutral off-white background, text in near-black, one calm accent colour for primary actions. Use red, amber and green only for status, and never as the only signal.
- Forbidden: gradients, glassmorphism, glow, neon digits, dark navy hero panels, emoji, sparkle or “AI” badges, pulsing animation, fake metrics, stock illustrations, fake testimonials, badge overload, cards nested inside cards.
- Mobile first. Design at 360px width, single column, touch targets of at least 44px, no horizontal scroll. Check 360, 768 and 1280.
- Plain language at about grade 8. No jargon in the main flow (RRN, switch, telemetry). Explain unavoidable terms in one short line.
- Forms: label above input, inline validation with specific messages, an error summary at the top, never lose entered data, always a Back button.
- Accessibility: full keyboard use, visible focus, semantic landmarks, contrast of at least 4.5:1, honour `prefers-reduced-motion`. The countdown updates once a minute and is not an aria-live region.
- Each screen has one primary action and one sentence saying what happens next.

### 7.2 Pages

1. **Landing `/`**: a plain headline and one-sentence explanation; one primary button (“Start your complaint”). Sections: the problem (money debited, transaction failed, unsure what to do); how it works in 4 steps; what you get (formal complaint, CBN deadline, record, escalation help); **what ReverseIt does not do** (does not move money, does not contact the bank for you, does not guarantee a refund; your bank resolves it); the CBN timeline table with sources and a “last checked” date; a short FAQ of 6 questions; a footer saying ReverseIt is not a bank, not legal advice, and not affiliated with the CBN or any bank. Repeat the primary button once near the bottom.
2. **`/start` Add your alert**: two clear options, Paste text and Upload screenshot (no voice). A short consent line that states exactly what is sent to the AI provider. “Try an example” is optional.
3. **`/check` Check the details**: editable fields (amount, date, time, channel, bank, reference). For images, show the extracted text above the fields. Bank selector if the bank is Unknown. Optional last 4 digits of the account. A checkbox: “These match my alert.”
4. **`/problem` What went wrong**: five options (failed transfer, duplicate debit, POS or web failure, ATM cash not dispensed, sent to the wrong account). Show the deadline for each from `deadlines.json`, with the Estimate badge when applicable. “Wrong account” explains there is no regulatory deadline and a recall request depends on the recipient.
5. **`/complaint` Review and send**: editable complaint; the To address (editable, with the verification notice); buttons **Email to my bank**, **Open Gmail**, **Copy complaint**, **Copy bank email**, **Print or save as PDF** (print stylesheet). A note: “Attach your alert screenshot before sending.”
6. **`/case/:id`**: a status timeline with self-reported statuses; the countdown; ticket-number and notes fields; buttons Mark bank replied, Mark resolved, Escalate; **Add reminder** (a client-side `.ics` file at the deadline); a visible line “Counted from when you told us you sent it.”
7. **`/case/:id/escalate`**: the three tiers with copy buttons and pre-written messages, plus an evidence checklist (your complaint with its timestamp, the bank’s ticket number, the alert or screenshot, a statement line showing the debit, bank replies).
8. **`/cases`**: cases saved in this browser, with their status and time left.

The progress indicator for pages 2 to 5 reads “Step X of 4” and is derived from one route config, never hard-coded.

### 7.3 The send flow

- **Email to my bank** does three things: it calls `mail-opened` (the case stays `draft_ready`), it saves a local flag, and it opens a `mailto:` link with the bank address, subject (`Dispute: {type} NGN {amount} Ref {reference}`) and the complaint as the body.
- If the encoded `mailto:` link is longer than 1,800 characters, open it with To and Subject only, copy the complaint to the clipboard, and say “Complaint copied. Paste it into the email.”
- **Open Gmail** uses `https://mail.google.com/mail/?view=cm&fs=1&to=...&su=...&body=...` with the same length rule.
- **Return prompt.** When the user returns (listen for `visibilitychange`, `focus` and `pageshow`) and also whenever a case in `draft_ready` is opened, show an inline banner: “Did you send your complaint?” with three buttons: **Yes, just now** (confirm-sent with the current time), **I sent it earlier** (a datetime picker, clamped to the valid range), and **Not yet** (stays a draft). State comes from the saved case, not only from browser events, because some phones reload the page.
- The countdown starts only after confirm-sent. The deadline text is “{hours} left. Counted from when you told us you sent it.” After the deadline it reads “Your bank’s timeline has passed” and links to the escalation page. Never say the bank is “in breach”.
- Show on the confirm screen: “Keep your sent email. It is your evidence.”

### 7.4 Copy rules

Use: helps you file, drafts, shows the CBN timeline, keeps a record, escalation pack, your bank reverses. Never use: we reverse, we refund, guaranteed, instant refund, zero hallucinations, bank-grade, certified, official bank credit advice, real-time NIBSS, connected to your bank, provisional credit. Privacy text must describe only what the code actually does. Alert text and screenshots are sent to the AI provider for extraction, and the case is stored on our server. State what is stored and for how long (ask the human if undecided).

## 8. Phase 5: consistency pass

- One app name, ReverseIt, in the header, page titles, footer and meta tags.
- No placeholder or test data left (for example the stray “k” narration field, `NIP-DEMO`, fake case IDs).
- Deadlines, tiers and contacts come only from the JSON files. Search the code to confirm no duplicates are hard-coded.
- Times are UTC in storage and WAT on screen. The countdown and the deadline text agree with each other everywhere.
- Remove any leftover reference to simulated behaviour.

## 9. Phase 6: tests and verification

- Unit tests: deadline calculation; every valid and invalid state transition; the `mailto:` and Gmail builders (encoding, 1,800-character fallback); config loading.
- API tests for the parse endpoints with the parser and the LLM mocked (no network): success, `could_not_parse`, oversized file, wrong file type, rate limit.
- A test that scans the source and fails if any banned phrase from section 7.4 or section 5 (“Zero hallucinations”, “Certified”, “Staff Portal”, and so on) appears.
- If the repo has an E2E tool, add one happy-path test: paste an example alert, confirm, choose a problem, open the email, confirm sent, and see the countdown.
- Run an accessibility check (for example axe) on every page and fix critical issues. Test at 360px width.
- Run the real parser on at least these made-up inputs and report the results: a POS alert, an ATM alert, a transfer alert with a `12th October 2026` date, a 12-hour time (`4:15 PM`), a balance line before the debit amount, and a credit alert.

## 10. Phase 7: final report

Write `docs/REPORT.md` and print a summary: what was deleted, what was added, decisions you made, a list of every data item still marked `verified: false`, how to run the app and the tests, and known gaps. Do not claim anything is done unless you ran it.

## 11. Reference data

**Starting deadlines** (all from CBN documents or press coverage; the human must re-check against current circulars):

| Problem type | window\_hours | verified | Note |
| --- | --- | --- | --- |
| ATM not dispensed, on-us | 24 | true | Instant reversal is expected; if it fails, manual reversal within 24 hours |
| ATM not dispensed, not-on-us | 48 | true | Refund within 48 hours |
| POS failure | 72 | true | CBN circular says 48 hours; CBN press release says 72 hours. Use 72 so a bank is never called late when it may not be |
| Web checkout failure | 72 | true | Same note as POS |
| Failed transfer (NIP) | 48 | false | No specific CBN source found. Show as an estimate |
| Duplicate debit | use the channel’s window | false for transfers | Same note |
| Sent to wrong account | none | n/a | No deadline; recall depends on the recipient |

**Sources:** CBN circular PSM/DIR/CON/CWO/07/127 dated 31 May 2020, effective 8 June 2020; CBN press release on payment channels (2020). Newer CBN ATM operating guidelines may supersede the ATM rows, so say “check the latest circulars”.

**Escalation tiers:**

1. The bank’s dispute desk. Use it first, then allow the channel deadline.
2. The bank’s head office complaints unit. Use it if the bank has not acknowledged within 3 days, has given no ticket number, or the deadline has passed.
3. The CBN Consumer Protection Department. Use it if the bank misses its timeline or does not acknowledge. Email `cpd@cbn.gov.ng` (verified from the CBN’s own complaint guide, CPD/GEN/GUIDE/03, January 2022), or write to the Director, Consumer Protection Department, Central Bank of Nigeria, Central Business District, Garki, Abuja (`verified: false` until checked). The CBN guide says to complain to the bank first, keep evidence of that, and allow up to two weeks for general complaints. Do not imply the CBN acts at 24 hours. A media-reported CBN phone number exists; include it only as `verified: false`.

## 12. Do not

- Do not touch or delete the three Python parser files except to expose them over HTTP.
- Do not add accounts, payments, analytics trackers or third-party scripts.
- Do not store full account numbers or log alert text or images.
- Do not send email from the server. The customer sends from their own email app.
- Do not mark data `verified: true` unless a source URL is recorded and it says so.
- Do not leave the app broken at the end of any phase.
