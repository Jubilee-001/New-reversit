# ReverseIt backend task plan

This plan follows the backend engineering brief stored in `docs/BACKEND_TASK.md`.

## Status

- Phase 0: audit complete — the repository already contains a working customer-facing FastAPI app and a functioning customer-only redesign. The backend brief describes a stricter backend hardening pass, so we keep the working app and work within its existing boundaries instead of rewriting the product to a different architecture.
- Phase 1: requirements inventory complete — the current repo already has API routes, config JSON, parser entry points, case model and state transitions. The remaining work is to align the backend with the hardening brief without breaking the customer flow.
- Phase 2: in progress — add missing safeguards, documentation and explicit decision records around parser quality, case events, and operational safety.

## Decision summary

1. Keep the existing FastAPI app structure rather than introducing a wholly separate microservice layout. The repo is already functional and the user-facing product depends on it.
2. Preserve the root-level parser contract (`parse_alert`, `parse_with_regex`, `extract_text_from_image`) and add additive safety checks instead of changing signatures.
3. Treat `data/*.json` as the source of truth and avoid duplicating business rules in the frontend or route handlers.
4. Record any hardening gaps in `docs/DECISIONS.md` so future work can pick them up without re-negotiating the product direction.

## Execution plan

### Phase 0 — audit and decision
- Read the backend brief and the existing codebase.
- Confirm which parts already satisfy the product brief and which parts would require a broader rewrite.
- Decide to keep the current app architecture and harden it in place.

### Phase 1 — safety and contract hardening
- Confirm parser contracts and failure modes.
- Add or document validation rules around file limits, bad images, rate limiting, and no-storage-of-sensitive-data requirements.
- Ensure no operational code logs raw alert text, OCR output or uploaded images.

### Phase 2 — case lifecycle and audit safety
- Preserve the authoritative deadline logic and lifecycle rules already encoded in the case service.
- Add explicit event logging and idempotency checks where needed.
- Keep all state transitions behind service functions, never in route handlers.

### Phase 3 — parser quality and evaluation
- Keep the parser pipeline deterministic and grounded.
- Add a documented evaluation harness, failing golden cases, and measurement paths for offline and live runs.
- Maintain the requirement that unsupported or low-quality parse attempts fail cleanly and keep manual entry available.

### Phase 4 — API and documentation consistency
- Keep `GET /api/config`, case routes and parse routes versioned and consistent.
- Update docs so the project records the current status and the next hardening steps.

## Open items and follow-up decisions

- The repo already contains a lot of customer-facing backend logic, so the final hardening pass should be additive rather than a full rewrite.
- Any future major refactor (for example adding `app/api/v1` and `app/services/`) should be done in a separate branch to avoid disturbing the working customer flow.
- The current project should remain runnable after each incremental safety improvement.
