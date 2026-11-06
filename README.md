# ReverseIt

ReverseIt helps a Nigerian bank customer file and track a complaint when a debit
fails. A customer pastes a debit alert or uploads a screenshot. ReverseIt reads
the amount, date, time, channel, bank and reference, lets the customer correct
them, and drafts a formal complaint to the bank. It then tracks the CBN deadline
from the moment the customer says they sent it, and shows how to escalate.

ReverseIt is **not** a bank. It does not move money, does not promise a refund,
does not contact the bank for the customer, and is not affiliated with the CBN
or any bank.

## What it does

- Extracts transaction fields from pasted alert text or a screenshot.
- Shows the CBN timeline for the problem, with its source and a note to check
  the latest circulars.
- Drafts an editable complaint and opens it in the customer's own email app.
- Tracks a self-reported status and a deadline counted from when the customer
  says they sent the complaint.
- Provides an escalation pack with the three escalation tiers and an evidence
  checklist.

## What it does not do

- It does not move money, reverse a transaction or guarantee a refund.
- It does not contact the bank for the customer.
- It does not store full account numbers. Only the last four digits are kept,
  and only if the customer types them.
- It does not send email from the server.

## Run locally

Requirements: Python 3.10+ and Node 20+.

```bash
# 1. Python backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env          # add GROQ_API_KEY for screenshots/LLM fallback
.venv/bin/uvicorn app.main:app --reload --port 8000

# 2. Web app (in a second terminal)
npm install
npm run dev:web               # http://localhost:5173
```

The web app reads `VITE_API_BASE_URL` (default `http://localhost:8000/api`).

## Test

```bash
.venv/bin/pytest
npm run test:web --if-present
npm run build:web
```

## Data and privacy

- Alert text and screenshots are sent to the AI provider (Groq) for extraction.
- A case is stored on our server until the customer deletes it.
- No alert text or image is written to logs.
- There are no user accounts. The case link is the access key. “My cases” lists
  only the case IDs saved in the browser's local storage.

## Configuration

`data/deadlines.json`, `data/banks.json` and `data/escalation.json` are the single
source of truth for timelines, bank dispute contacts and escalation tiers. They
are served at `GET /api/config`. Items not checked against a current source are
marked `verified: false` and shown with an “Estimate” badge or a verification
notice.
