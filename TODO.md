# TODO - Prowider Mini Lead Distribution System

- [x] Run test suite (jest) and capture any failures
- [x] Run typecheck/lint (if available)
- [ ] Verify required routes exist and match spec:
  - [x] `/request-service` customer form creates leads and enforces duplicate phone+service at DB level
  - [x] `/dashboard` shows provider quota + assigned leads
  - [x] `/test-tools` reset-quota + generate-10-concurrent + webhook idempotency buttons
- [x] Fix failing tests / requirement mismatches (allocation logic, quotas, concurrency, webhook idempotency, SSE)
- [x] Re-run tests to confirm fixes
- [x] Prepare final submission notes (allocation algorithm, concurrency strategy, webhook idempotency)

