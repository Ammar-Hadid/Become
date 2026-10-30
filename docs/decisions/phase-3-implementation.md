# Phase 3 implementation plan

Historical implementation and verification record. Its visual, layout, navigation, copy and interaction choices are not requirements or a baseline for the frontend redesign. Domain semantics and objective technical constraints remain applicable.


The authoritative Finance contract is [PHASE_3_FINANCE.md](../product/PHASE_3_FINANCE.md).
Its SPEC.md reference resolves to MASTER_SPEC.md. Existing Phase 1/2 behavior remains authoritative outside Finance.

## Sequence and checkpoints

- [x] 1. Finance shell and exact money/calendar boundaries.
- [x] 2. Accounts, atomic first reconciliation, current/historical recorded position.
- [x] 3. Transactions, same-currency transfers, categories, cursor ledger and cash movement.
- [x] 4. Application Settings shell and currency reserve policy.
- [x] 5. Goals, allocation/rebalance, goal spending and atomic purchase.
- [x] 6. Pure calendar recurrence, definitions and exact projections.
- [x] 7. Snapshotted occurrences, bounded idempotent catch-up, confirmation and correction.
- [x] 8. Work sources and opportunities.
- [x] 9. Explicit accepted-opportunity create/link/not-now continuation.
- [x] 10. Finance activity snapshots, timer decomposition and metadata correction.
- [x] 11. Payment-first allocation, completeness/invalidation and exact linked rate.
- [x] 12. Unified overview, period comparisons and deterministic Needs Attention.
- [x] 13. PostgreSQL race/integrity tests, responsive browser journeys, accessibility and documentation.

## Integrity decisions

Use additive slice migrations and composite ownership foreign keys. Money is PostgreSQL BIGINT; decimal parsing is string-based. Balances use the latest reconciliation at/before the instant plus strictly subsequent flows. Unknown position remains unavailable.

Lock the user/currency policy row to recheck savings capacity. Lock transaction rows when replacing monetary attribution, and recurring definition rows during catch-up/edit. Use ordinary Read Committed transactions with consistent lock ordering; unique occurrence and posting keys provide the final duplicate barrier. No financial writes occur during GET rendering.

Keep goal spending and allocation release independent; corrections never silently choose user intent. Work and payment dates remain independent. Opportunity acceptance never automatically creates a work source.

## Verification

Each schema slice includes its service and usable interface before the next schema slice. Run focused unit tests/typechecking at checkpoints; use local PostgreSQL for constraints and concurrent mutations. Finish with lint, complete unit/integration tests, production build, and browser journeys on desktop/tablet/mobile. Test fixtures must be isolated and cleaned up.

## Additive refinements supported by implementation evidence

- Account currency is included in transaction ownership foreign keys, so direct database writes cannot create cross-currency transfers.
- `SavingsGoal.completionNeedsReviewAt` records that goal spending changed after explicit completion. This preserves the completion decision while exposing the correction for review; explicit goal review clears it.
- Recurrence pause/resume uses the processing cursor as the eligibility boundary: resume moves it to the day before resumption. Paused dates are not replayed. Historical old terms are processed before definition edits; today's unprocessed terms require an explicit choice when due.
- Multiple inline Finance forms share a single navigation guard to avoid duplicate confirmations/history traversal. Engineering's existing project guard remains unchanged.
- Timer domain fields are separate Engineering and Finance components; no payment questions were added to stop.
- Financial date/time forms retain millisecond precision. Reconciliation remains inclusive, and subsequent flows strictly exclude the reconciliation instant.

## Completed verification — 5 September 2026

- All 15 migrations are applied locally: four existing migrations plus eleven additive Finance migrations. Existing migration history was preserved.
- 77 tests passed with both Finance and Engineering reference-data PostgreSQL suites enabled. Finance covers 19 database scenarios; money, savings, recurrence and exact effective-rate calculations also have deterministic unit coverage.
- All 30 Playwright journeys passed on the production build: twelve Finance journeys and eighteen existing Engineering, session-detail and timer journeys across desktop, tablet and mobile. Finance coverage includes all three accepted-opportunity choices, skipped/confirmed/automatic recurrence, partial goal purchases, attribution, deletion, cursor pagination, validation preservation, browser-back protection, keyboard trapping and focus restoration.
- Desktop, tablet and mobile Finance screenshots were inspected; overflow assertions passed for the overview and payment-attribution surfaces.
- TypeScript, ESLint and `git diff --check` passed. Production build passed using `next build --webpack`.
- The default Turbopack build could not bind its internal CSS worker port in the execution environment (`Operation not permitted`). The supported Webpack build completed; the repository's default build command remains unchanged.

Local browser fixtures assign separate test client addresses, allowing production authentication throttling to stay enabled. Finance fixtures remove their own test users and financial records. There was no deployment or commit.
