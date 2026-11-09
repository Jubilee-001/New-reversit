# ReverseIt backend task progress

## Current status

This repository already contains a working customer-only ReverseIt implementation. The attached backend brief describes a stricter hardening pass, so we are keeping the working app stable and documenting the backend-hardening path in place rather than rewriting the project into a different architecture.

## Phase 0 — audit and decision
- Completed: read the brief and inspected the current repository structure.
- Decision recorded: keep the existing FastAPI app and harden it incrementally rather than rebuild the product.
- Documentation created: `docs/BACKEND_TASK.md`, `docs/PLAN.md`, and `docs/DECISIONS.md`.

## Phase 1 — current repository alignment
- Confirmed: parser entry points and customer-facing routes already exist.
- Confirmed: the app is already running in a FastAPI stack with SQLite-backed case persistence and JSON-driven config.
- Remaining work: align with the stricter safety and audit requirements in the backend brief without breaking the current product behavior.

## Phase 2 — forward plan
- Preserve the parser and case-service contracts.
- Add explicit safety and validation checks around file handling, rate limits, and privacy.
- Keep state transitions in service functions, not in route handlers.
- Keep `data/*.json` as the source of truth for deadlines, banks and escalation tiers.
- Add evaluation and audit tooling incrementally, documenting the exact next step when the next pass begins.

## Notes

This is intentionally an additive, non-disruptive path. The repo is already functional and the brief is a hardening plan, not a demand for a new product architecture.

## Validation results

### pytest -q
```text
..............................                                           [100%]
=============================== warnings summary ===============================
.venv/lib/python3.14/site-packages/fastapi/testclient.py:1
  /home/gamp/reverseit/.venv/lib/python3.14/site-packages/fastapi/testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
30 passed, 1 warning in 2.71s
```

### ruff check .
```text
B008 Do not perform function call `Depends` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
  --> app/cases_api.py:74:50
   |
73 | @router.post("/cases", status_code=201)
74 | def post_case(payload: CaseCreate, db: Session = Depends(get_db)):
   |                                                  ^^^^^^^^^^^^^^^
75 |     try:
76 |         case = create_case(db, payload.model_dump())
   |

B008 Do not perform function call `Depends` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
  --> app/cases_api.py:83:43
   |
82 | @router.get("/cases/{case_id}")
83 | def read_case(case_id: str, db: Session = Depends(get_db)):
   |                                           ^^^^^^^^^^^^^^^
84 |     return get_case(db, case_id).to_dict()
   |

B008 Do not perform function call `Depends` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
  --> app/cases_api.py:88:65
   |
87 | @router.patch("/cases/{case_id}")
88 | def update_case(case_id: str, payload: CasePatch, db: Session = Depends(get_db)):
   |                                                                 ^^^^^^^^^^^^^^^
89 |     case = get_case(db, case_id)
90 |     if payload.complaint_text is not None:
   |

B008 Do not perform function call `Depends` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
   --> app/cases_api.py:106:45
    |
105 | @router.delete("/cases/{case_id}", status_code=204)
106 | def delete_case(case_id: str, db: Session = Depends(get_db)):
    |                                             ^^^^^^^^^^^^^^^
107 |     case = get_case(db, case_id)
108 |     db.delete(case)
    |

B008 Do not perform function call `Depends` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
   --> app/cases_api.py:114:50
    |
113 | @router.post("/cases/{case_id}/mail-opened")
114 | def post_mail_opened(case_id: str, db: Session = Depends(get_db)):
    |                                                  ^^^^^^^^^^^^^^^
115 |     case = get_case(db, case_id)
116 |     try:
    |

B008 Do not perform function call `Depends` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
   --> app/cases_api.py:126:73
    |
125 | @router.post("/cases/{case_id}/confirm-sent")
126 | def post_confirm_sent(case_id: str, payload: ConfirmSent, db: Session = Depends(get_db)):
    |                                                                         ^^^^^^^^^^^^^^^
127 |     case = get_case(db, case_id)
128 |     sent_at = parse_utc(payload.sent_at) if payload.sent_at else None
    |

B008 Do not perform function call `Depends` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
   --> app/cases_api.py:139:69
    |
138 | @router.post("/cases/{case_id}/bank-reply")
139 | def post_bank_reply(case_id: str, payload: BankReply, db: Session = Depends(get_db)):
    |                                                                     ^^^^^^^^^^^^^^^
140 |     case = get_case(db, case_id)
141 |     try:
    |

B008 Do not perform function call `Depends` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
   --> app/cases_api.py:151:46
    |
150 | @router.post("/cases/{case_id}/resolve")
151 | def post_resolve(case_id: str, db: Session = Depends(get_db)):
    |                                              ^^^^^^^^^^^^^^^
152 |     case = get_case(db, case_id)
153 |     try:
    |

B008 Do not perform function call `Depends` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
   --> app/cases_api.py:163:66
    |
162 | @router.post("/cases/{case_id}/escalate")
163 | def post_escalate(case_id: str, payload: Escalate, db: Session = Depends(get_db)):
    |                                                                  ^^^^^^^^^^^^^^^
164 |     case = get_case(db, case_id)
165 |     try:
    |

ISC004 Unparenthesized implicit string concatenation in collection
  --> app/complaint.py:75:9
   |
73 |           "Please acknowledge this complaint and give me a ticket or reference number within 3 days.",
74 |           "",
75 | /         "If this is not resolved in time, I may escalate the complaint to the Consumer "
76 | |         "Protection Department of the Central Bank of Nigeria.",
   | |_______________________________________________________________^
77 |           "",
78 |           "Thank you,",
   |
help: Did you forget a comma?
help: Wrap implicitly concatenated strings in parentheses
   |
74 |         "",
   -         "If this is not resolved in time, I may escalate the complaint to the Consumer "
   -         "Protection Department of the Central Bank of Nigeria.",
75 +         ("If this is not resolved in time, I may escalate the complaint to the Consumer "
76 +         "Protection Department of the Central Bank of Nigeria."),
77 |         "",
   |
note: This is an unsafe fix and may change runtime behavior

I001 [*] Import block is un-sorted or un-formatted
 --> app/database.py:1:1
  |
1 | / import os
2 | | from collections.abc import Generator
3 | | from sqlalchemy import create_engine
4 | | from sqlalchemy.orm import declarative_base, sessionmaker, Session
  | |__________________________________________________________________^
5 |
6 |   DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./reverseit.db")
  |
help: Organize imports
  |
2 | from collections.abc import Generator
3 +
4 | from sqlalchemy import create_engine
  - from sqlalchemy.orm import declarative_base, sessionmaker, Session
5 + from sqlalchemy.orm import Session, declarative_base, sessionmaker
6 |
  |

I001 [*] Import block is un-sorted or un-formatted
  --> app/main.py:3:1
   |
 1 |   """ReverseIt — customer-only complaint and deadline API."""
 2 |
 3 | / from __future__ import annotations
 4 | |
 5 | | import os
 6 | | from collections.abc import AsyncGenerator
 7 | | from contextlib import asynccontextmanager
 8 | |
 9 | | from fastapi import FastAPI
10 | | from fastapi.middleware.cors import CORSMiddleware
11 | |
12 | | from app.database import Base, engine
13 | | from app.cases_api import router as cases_router
14 | | from app.parser_api import router as parser_router
   | |__________________________________________________^
help: Organize imports
   |
11 |
12 + from app.cases_api import router as cases_router
13 | from app.database import Base, engine
   - from app.cases_api import router as cases_router
14 | from app.parser_api import router as parser_router
   |

RUF022 [*] `__all__` is not sorted
  --> app/models.py:98:11
   |
98 | __all__ = ["Case", "STATUSES", "NON_RESOLVED"]
   |           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
help: Apply an isort-style sorting to `__all__`
   |
97 |
   - __all__ = ["Case", "STATUSES", "NON_RESOLVED"]
98 + __all__ = ["NON_RESOLVED", "STATUSES", "Case"]
   |

RUF022 [*] `__all__` is not sorted
  --> app/parser_adapter.py:11:11
   |
 9 | from parse import parse_alert, parse_screenshot
10 |
11 | __all__ = ["parse_alert", "parse_screenshot", "extract_text_from_image"]
   |           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
help: Apply an isort-style sorting to `__all__`
   |
10 |
   - __all__ = ["parse_alert", "parse_screenshot", "extract_text_from_image"]
11 + __all__ = ["extract_text_from_image", "parse_alert", "parse_screenshot"]
   |

B008 Do not perform function call `File` in argument defaults; instead, perform the call within the function, or read the default from a module-level singleton variable
  --> app/parser_api.py:85:61
   |
84 | @router.post("/extract-image-text")
85 | def extract_image_text(request: Request, file: UploadFile = File(...)):
   |                                                             ^^^^^^^^^
86 |     if not image_limiter.allow(client_key(request)):
87 |         raise HTTPException(
   |

UP017 [*] Use `datetime.UTC` alias
 --> app/timeutil.py:9:25
  |
8 | def utcnow() -> datetime:
9 |     return datetime.now(timezone.utc)
  |                         ^^^^^^^^^^^^
help: Convert to `datetime.UTC` alias
   |
4  |
   - from datetime import datetime, timezone
5  + from datetime import datetime, timezone, UTC
6  |
7  |
8  | def utcnow() -> datetime:
   -     return datetime.now(timezone.utc)
9  +     return datetime.now(UTC)
10 |
   |

UP017 [*] Use `datetime.UTC` alias
  --> app/timeutil.py:16:37
   |
14 |         return None
15 |     if value.tzinfo is None:
16 |         return value.replace(tzinfo=timezone.utc)
   |                                     ^^^^^^^^^^^^
17 |     return value.astimezone(timezone.utc)
   |
help: Convert to `datetime.UTC` alias
   |
4  |
   - from datetime import datetime, timezone
5  + from datetime import datetime, timezone, UTC
6  |
--------------------------------------------------------------------------------
15 |     if value.tzinfo is None:
   -         return value.replace(tzinfo=timezone.utc)
16 +         return value.replace(tzinfo=UTC)
17 |     return value.astimezone(timezone.utc)
   |

UP017 [*] Use `datetime.UTC` alias
  --> app/timeutil.py:17:29
   |
15 |     if value.tzinfo is None:
16 |         return value.replace(tzinfo=timezone.utc)
17 |     return value.astimezone(timezone.utc)
   |                             ^^^^^^^^^^^^
help: Convert to `datetime.UTC` alias
   |
4  |
   - from datetime import datetime, timezone
5  + from datetime import datetime, timezone, UTC
6  |
--------------------------------------------------------------------------------
16 |         return value.replace(tzinfo=timezone.utc)
   -     return value.astimezone(timezone.utc)
17 +     return value.astimezone(UTC)
18 |
   |

BLE001 Do not catch blind exception: `Exception`
   --> image_input.py:98:12
    |
 96 |             return None
 97 |         return text
 98 |     except Exception as e:
    |            ^^^^^^^^^
 99 |         print(f"[Vision Error]: {e}")
100 |         return None
    |

I001 [*] Import block is un-sorted or un-formatted
  --> parse.py:11:1
   |
 9 |   Failure: {"error": "could_not_parse", "missing": [<field names>]}
10 |   """
11 | / import os
12 | | import re
13 | | import json
14 | | import math
15 | | import time
16 | | from collections import deque
17 | | from datetime import datetime
18 | |
19 | | from dotenv import load_dotenv
20 | | from groq import Groq
   | |_____________________^
21 |
22 |   load_dotenv()
   |
help: Organize imports
   |
10 | """
11 + import json
12 + import math
13 | import os
14 | import re
   - import json
   - import math
15 | import time
   |

BLE001 Do not catch blind exception: `Exception`
   --> parse.py:204:12
    |
202 |             return result
203 |         return {"_ai_error_reason": "ai_error"}
204 |     except Exception as e:
    |            ^^^^^^^^^
205 |         print(f"[LLM Error]: {e}")
206 |         return {"_ai_error_reason": "ai_error"}
    |

F541 [*] f-string without any placeholders
   --> parse.py:316:27
    |
314 |         lower,
315 |     )
316 |     amount_re = re.search(rf"(?:ngn|₦|n\s*\d|\b\d[\d,]*(?:\.\d{{1,2}})?\b)", lower)
    |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
317 |     if balance_ctx and amount_re and norm in lower:
318 |         return True
    |
help: Remove extraneous `f` prefix
    |
315 |     )
    -     amount_re = re.search(rf"(?:ngn|₦|n\s*\d|\b\d[\d,]*(?:\.\d{{1,2}})?\b)", lower)
316 +     amount_re = re.search(r"(?:ngn|₦|n\s*\d|\b\d[\d,]*(?:\.\d{1,2})?\b)", lower)
317 |     if balance_ctx and amount_re and norm in lower:
    |

SIM103 Return the condition `bool(balance_ctx and amount_re and norm in lower)` directly
   --> parse.py:317:5
    |
315 |       )
316 |       amount_re = re.search(rf"(?:ngn|₦|n\s*\d|\b\d[\d,]*(?:\.\d{{1,2}})?\b)", lower)
317 | /     if balance_ctx and amount_re and norm in lower:
318 | |         return True
319 | |     return False
    | |________________^
help: Replace with `return bool(balance_ctx and amount_re and norm in lower)`
    |
316 |     amount_re = re.search(rf"(?:ngn|₦|n\s*\d|\b\d[\d,]*(?:\.\d{{1,2}})?\b)", lower)
    -     if balance_ctx and amount_re and norm in lower:
    -         return True
    -     return False
317 +     return bool(balance_ctx and amount_re and norm in lower)
318 |
    |
note: This is an unsafe fix and may change runtime behavior

BLE001 Do not catch blind exception: `Exception`
   --> parse.py:410:16
    |
408 |         try:
409 |             regex_result = parse_with_regex(clean_text)
410 |         except Exception as exc:  # pragma: no cover - defensive
    |                ^^^^^^^^^
411 |             print(f"[Regex Exception]: {exc}")
412 |             regex_result = None
    |

BLE001 Do not catch blind exception: `Exception`
   --> parse.py:507:12
    |
505 |             "error": "could_not_parse",
506 |         }
507 |     except Exception as exc:  # last-resort guard: the contract says never crash
    |            ^^^^^^^^^
508 |         print(f"[parse_alert Exception]: {exc}")
509 |         return {
    |

BLE001 Do not catch blind exception: `Exception`
   --> parse.py:545:12
    |
543 |             }
544 |         return parse_alert_result(text)
545 |     except Exception as exc:
    |            ^^^^^^^^^
546 |         print(f"[parse_screenshot Exception]: {exc}")
547 |         return {
    |

I001 [*] Import block is un-sorted or un-formatted
 --> regex_parser.py:1:1
  |
1 | / import math
2 | | import re
3 | | from datetime import datetime
  | |_____________________________^
help: Organize imports
  |
4 |
  -
5 | KNOWN_BANKS = {
  |

ISC004 Unparenthesized implicit string concatenation in collection
  --> regex_parser.py:88:13
   |
86 |           ),
87 |           (
88 | /             r"\b(\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
89 | |             r"[a-z]*-\d{4})\b",
   | |______________________________^
90 |               ("%d-%b-%Y", "%d-%B-%Y"),
91 |           ),
   |
help: Did you forget a comma?
help: Wrap implicitly concatenated strings in parentheses
   |
87 |         (
   -             r"\b(\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
   -             r"[a-z]*-\d{4})\b",
88 +             (r"\b(\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
89 +             r"[a-z]*-\d{4})\b"),
90 |             ("%d-%b-%Y", "%d-%B-%Y"),
   |
note: This is an unsafe fix and may change runtime behavior

ISC004 Unparenthesized implicit string concatenation in collection
  --> regex_parser.py:93:13
   |
91 |           ),
92 |           (
93 | /             r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
94 | |             r"[a-z]*\s+\d{4})\b",
   | |________________________________^
95 |               ("%d %b %Y", "%d %B %Y"),
96 |           ),
   |
help: Did you forget a comma?
help: Wrap implicitly concatenated strings in parentheses
   |
92 |         (
   -             r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
   -             r"[a-z]*\s+\d{4})\b",
93 +             (r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
94 +             r"[a-z]*\s+\d{4})\b"),
95 |             ("%d %b %Y", "%d %B %Y"),
   |
note: This is an unsafe fix and may change runtime behavior

I001 [*] Import block is un-sorted or un-formatted
  --> tests/test_backend.py:3:1
   |
 1 |   """Unit tests for deadlines, state machine, config loading, and the parse API."""
 2 |
 3 | / from __future__ import annotations
 4 | |
 5 | | from unittest.mock import patch
 6 | |
 7 | | import pytest
 8 | | from fastapi.testclient import TestClient
 9 | |
10 | | from app.main import app
11 | | from app.case_service import TransitionError, confirm_sent, create_case, resolve, escalate, bank_reply
12 | | from app.config_loader import (
13 | |     deadline_window_hours,
14 | |     resolve_deadline,
15 | |     deadlines,
16 | |     banks,
17 | |     escalation,
18 | |     clear_cache,
19 | |     PROBLEM_TYPES,
20 | |     CHANNELS,
21 | | )
22 | | from app.database import Base, engine, SessionLocal
23 | | from app.models import Case, STATUSES
   | |_____________________________________^
help: Organize imports
   |
9  |
   - from app.main import app
   - from app.case_service import TransitionError, confirm_sent, create_case, resolve, escalate, bank_reply
10 + from app.case_service import (
11 +     TransitionError,
12 +     bank_reply,
13 +     confirm_sent,
14 +     create_case,
15 +     escalate,
16 +     resolve,
17 + )
18 | from app.config_loader import (
19 +     CHANNELS,
20 +     PROBLEM_TYPES,
21 +     banks,
22 +     clear_cache,
23 |     deadline_window_hours,
   -     resolve_deadline,
24 |     deadlines,
   -     banks,
25 |     escalation,
   -     clear_cache,
   -     PROBLEM_TYPES,
   -     CHANNELS,
26 +     resolve_deadline,
27 | )
   - from app.database import Base, engine, SessionLocal
   - from app.models import Case, STATUSES
   -
28 + from app.database import Base, SessionLocal, engine
29 + from app.main import app
30 + from app.models import STATUSES, Case
31 |
   |

F401 [*] `app.case_service.create_case` imported but unused
  --> tests/test_backend.py:11:61
   |
10 | from app.main import app
11 | from app.case_service import TransitionError, confirm_sent, create_case, resolve, escalate, bank_reply
   |                                                             ^^^^^^^^^^^
12 | from app.config_loader import (
13 |     deadline_window_hours,
   |
help: Remove unused import: `app.case_service.create_case`
   |
10 | from app.main import app
   - from app.case_service import TransitionError, confirm_sent, create_case, resolve, escalate, bank_reply
11 + from app.case_service import TransitionError, confirm_sent, resolve, escalate, bank_reply
12 | from app.config_loader import (
   |

F401 [*] `app.database.Base` imported but unused
  --> tests/test_backend.py:22:26
   |
20 |     CHANNELS,
21 | )
22 | from app.database import Base, engine, SessionLocal
   |                          ^^^^
23 | from app.models import Case, STATUSES
   |
help: Remove unused import
   |
21 | )
   - from app.database import Base, engine, SessionLocal
22 + from app.database import SessionLocal
23 | from app.models import Case, STATUSES
   |

F401 [*] `app.database.engine` imported but unused
  --> tests/test_backend.py:22:32
   |
20 |     CHANNELS,
21 | )
22 | from app.database import Base, engine, SessionLocal
   |                                ^^^^^^
23 | from app.models import Case, STATUSES
   |
help: Remove unused import
   |
21 | )
   - from app.database import Base, engine, SessionLocal
22 + from app.database import SessionLocal
23 | from app.models import Case, STATUSES
   |

C408 Unnecessary `dict()` call (rewrite as a literal)
   --> tests/test_backend.py:127:12
    |
126 |   def _make_case(db, status="draft_ready", case_id="test-case-1", **overrides):
127 |       data = dict(
    |  ____________^
128 | |         problem_type="failed_transfer",
129 | |         channel="transfer",
130 | |         bank_name="Test Bank",
131 | |         amount=100.0,
132 | |         txn_date="2026-10-13",
133 | |         txn_time="14:05",
134 | |         reference="REF123",
135 | |         complaint_text="Dear bank, I am disputing this debit.",
136 | |     )
    | |_____^
137 |       data.update(overrides)
138 |       case = Case(id=case_id, status=status, **data)
    |
help: Rewrite as a literal
    |
126 | def _make_case(db, status="draft_ready", case_id="test-case-1", **overrides):
    -     data = dict(
    -         problem_type="failed_transfer",
    -         channel="transfer",
    -         bank_name="Test Bank",
    -         amount=100.0,
    -         txn_date="2026-10-13",
    -         txn_time="14:05",
    -         reference="REF123",
    -         complaint_text="Dear bank, I am disputing this debit.",
    -     )
127 +     data = {
128 +         "problem_type": "failed_transfer",
129 +         "channel": "transfer",
130 +         "bank_name": "Test Bank",
131 +         "amount": 100.0,
132 +         "txn_date": "2026-10-13",
133 +         "txn_time": "14:05",
134 +         "reference": "REF123",
135 +         "complaint_text": "Dear bank, I am disputing this debit.",
136 +     }
137 |     data.update(overrides)
    |
note: This is an unsafe fix and may change runtime behavior

UP017 [*] Use `datetime.UTC` alias
   --> tests/test_backend.py:149:28
    |
147 |         case = _make_case(db, status="draft_ready", case_id="tc-sent")
148 |         from datetime import datetime, timezone
149 |         now = datetime.now(timezone.utc)
    |                            ^^^^^^^^^^^^
150 |         updated = confirm_sent(case, sent_at=now)
151 |         assert updated.status == "sent"
    |
help: Convert to `datetime.UTC` alias
    |
23  | from app.models import Case, STATUSES
24  + from datetime import UTC
25  |
--------------------------------------------------------------------------------
149 |         from datetime import datetime, timezone
    -         now = datetime.now(timezone.utc)
150 +         now = datetime.now(UTC)
151 |         updated = confirm_sent(case, sent_at=now)
    |

F401 [*] `pytest` imported but unused
 --> tests/test_banned_phrases.py:7:8
  |
5 | from pathlib import Path
6 |
7 | import pytest
  |        ^^^^^^
8 |
9 | ROOT = Path(__file__).resolve().parent.parent
  |
help: Remove unused import: `pytest`
  |
6 |
  - import pytest
7 |
  |

I001 [*] Import block is un-sorted or un-formatted
 --> tests/test_main.py:1:1
  |
1 | / from fastapi.testclient import TestClient
2 | | from app.main import app
  | |________________________^
3 |
4 |   client = TestClient(app)
  |
help: Organize imports
  |
1 | from fastapi.testclient import TestClient
2 +
3 | from app.main import app
  |

Found 37 errors.
[*] 17 fixable with `--fix` (5 unsafe fixes available with `--fix --unsafe-fixes`).
```
