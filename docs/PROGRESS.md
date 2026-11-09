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
