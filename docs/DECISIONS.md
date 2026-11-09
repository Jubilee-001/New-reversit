# ReverseIt backend hardening decisions

## Decision 1 — keep the existing FastAPI app and harden it in place
Reason: the repository already contains a working customer-only implementation. A full rewrite to a new architecture would break the product and pull attention away from the backend safety improvements described in the brief.
Alternatives considered: rebuilding the app into `app/services/` and `app/api/v1` from scratch; keeping the current app as-is. Chosen path: keep the existing app and add the missing safety checks and documentation incrementally.

## Decision 2 — preserve the root-level parser contract
Reason: the parser entry points are already in use by the app and the brief explicitly says to keep those public contracts working exactly. We must not change signatures and should prefer additive wrappers and checks.
Alternatives considered: replacing the parser with a new interface; deleting legacy helpers. Chosen path: keep `parse_alert`, `parse_with_regex`, and `extract_text_from_image` as the canonical contract.

## Decision 3 — treat JSON config files as the single source of truth
Reason: backend behavior around deadlines, banks, and escalation tiers should be derived from data files rather than copy-pasted values. This is already aligned with the current app design and avoids drift.
Alternatives considered: storing deadlines in service code or frontend constants. Chosen path: keep config loading and validation centralized.

## Decision 4 — prefer additive hardening over broad refactors
Reason: the repository is already in a running state and the prompt emphasizes safety, measured evaluation and correctness over a large architectural rewrite. We should make the backend safer and more measurable while keeping the app stable and working.
Alternatives considered: changing package structure and route layout immediately. Chosen path: add safety checks, documentation, and tests without breaking current routes or the customer workflow.
