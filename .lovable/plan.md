# Phase 2E — Authentication and RBAC Tests

## Scope
- Strengthen Phase 2 tests for Firebase-token authentication, `/auth/me`, database-backed patient/doctor/admin authorization, and forbidden access.
- Make test fixtures reliably isolate dependency overrides and use deterministic user fixtures; mock token verification so tests need no Firebase credentials.
- Update `backend/README.md` with Firebase environment setup, API prerequisites, focused test command, and an accurate Phase 2 status.
- Run only the focused Phase 2 auth/RBAC/model tests and report results, changed files, completed functionality, and manual configuration.

## Technical details
- Keep changes within `backend/tests/` and `backend/README.md`.
- Do not implement later-phase APIs or alter Git history/state.
