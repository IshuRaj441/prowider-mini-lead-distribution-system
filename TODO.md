# TODO

- [ ] Update `AllocationService.markWebhookEventProcessed` to use idempotent DB write (`upsert`), preventing Prisma `P2002` → HTTP 409. ✅
- [x] Re-run/typecheck (tests) to ensure no other webhook-idempotency paths still use `create()` for the same unique key.
- [x] Fix failing allocation tests caused by mandatory-provider quota checks / fairness.

- [x] Ensure webhook fix doesn’t break idempotency logic (all tests).
- [x] Make test suite deterministic (fix FK delete order + provider fixture assumptions).


