# Open Banking verification

Verified in an isolated checkout on `feature/open-banking`, based on `dc66d834f25a96f15919525139060cbc90b504ab`. The primary checkout and its original uncommitted work were preserved. The initial implementation verification used no production migration, deployment, bank consent or money movement; the later authorized setup is recorded separately below.

## Database and application contracts

A disposable PostgreSQL 17 database on localhost port 55439 was used. All 53 migrations applied, including the additive banking/evidence contracts, expected-income associations and independent account bank/issuer name. Prisma was regenerated from the authored schema. The test database is separate from personal Finance data. The owned `become-open-banking-test` container was stopped after verification; it can be restarted with `docker start become-open-banking-test`. The isolated port-3041 development server is also stopped.

The full applicable suite was run with both integration flags:

```sh
RUN_FINANCE_INTEGRATION=1 RUN_OPEN_BANKING_INTEGRATION=1 ./node_modules/.bin/vitest run
```

Result: **82 test files passed, 479 tests passed**. Another 16 files / 126 tests were skipped because their separate domain integration flags were not enabled. The enabled Finance and Open Banking integration suites passed against PostgreSQL.

The acceptance coverage includes:

- New live accounts start without a fabricated/manual balance; mapping activates fetched bank balance evidence. Manual accounts still require reconciliation.
- External CURRENT mapped to existing SAVINGS without changing account identity, nickname, inclusion, reserves or goal allocations.
- Four current-day transactions and three older unresolved transactions counted separately, including distinct unknown-counterparty and review states.
- Stable-reference retry/reauthorization, interrupted pagination, cursor persistence, lease loss, catch-up and rate-limited Sync now.
- Pending 100.00 booked at 87.42, immutable source revisions, material corrections, allocation concurrency and review reopening.
- Conservative manual/statement/live overlap handling, distinct identical purchases and metadata-preserving statement-to-live migration.
- One owned-transfer event with observed source legs; card purchases as expenses and repayment as a transfer.
- Linked card settlement validation, manual repayment and cross-user ownership rejection.
- Recurring expectation matching, confirmed expected-income occurrences and qualified deterministic forecasts.
- Recognized card refunds remain unreviewed; refunds do not fulfil expected income; allocated receipts require correction before refund reclassification.
- Date-only precision, local midnight and daylight-saving boundaries.
- Draft statement previews do not change live ledger/coverage. Generic CSV and real text-PDF extraction were tested; malformed documents are rejected.

## Browser and build checks

The two feature journeys passed in each configured browser project:

| Project              | Result     | Verified interactions                                                                                         |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| Chromium desktop     | 2/2 passed | Mapping, card settings, named artwork, review, statement import, forecast and page-two detail/back navigation |
| iPhone/WebKit mobile | 2/2 passed | Same journeys in narrow layouts, visible account/bank names, keyboard controls and reduced motion             |
| iPad/WebKit tablet   | 2/2 passed | Same journeys in tablet layouts                                                                               |

```sh
BECOME_E2E_PORT=3041 ./node_modules/.bin/playwright test e2e/open-banking.spec.ts
./node_modules/.bin/eslint .
./node_modules/.bin/tsc --noEmit
BETTER_AUTH_URL=https://become-test.example.test \
BECOME_DATA_DIR=/private/tmp/become-open-banking-build-data \
./node_modules/.bin/next build --webpack
```

Repository ESLint, TypeScript and the production build passed. Production-shaped test origin/media configuration was used for build validation; no production services were started. The isolated development server was stopped before the production build. Existing Next development Fast Refresh/destination-stream warnings appeared during some browser transitions; all asserted journeys passed.

Synthetic screenshots are saved under [open-banking/](open-banking/), including named card faces and desktop/mobile accounts. Artwork URLs were refreshed after a final visual check identified an optimized-image cache still serving the previous design.

## Verification boundary

The provider adapter and authorization callbacks were tested with controlled provider responses. These tests do **not** establish real Enable Banking sandbox consent, production entitlement, the owner's actual Revolut availability or an exact ING More statement format. Configure and validate the sandbox flow before real authorization. The user performs bank authorization and supplies a representative redacted ING export for format verification.

No individual card artwork was supplied by verified provider data. The included original card-face illustrations use issuer-inspired colours and physical card proportions, with the actual mapped/entered bank name and Become nickname rendered as live text. They contain no invented card number, expiry or network mark. Savings remains a reserve illustration.

See [setup and operations](../deployment/OPEN_BANKING.md), [architecture](../decisions/OPEN_BANKING.md) and [research](../research/OPEN_BANKING.md).

## Authorized deployment and provider setup — 1 October 2026

The deployable release was recreated from the existing production `origin/main`, replaying only the eight Finance/Open Banking implementation commits. Unmerged Nexo work from the original feature base was excluded. The original feature checkout and the primary checkout's pre-existing changes were preserved. Release changes are tracked in [PR 19](https://github.com/Ammar-Hadid/Become/pull/19).

Before production migration, a coordinated database/media backup was restored inside a network-isolated PostgreSQL 17 container on the VPS. All three new migrations applied. Fingerprints of existing account records, balance snapshots, transactions, Savings goals and allocations matched before and after; they also matched in production after deployment. Existing manual history received MANUAL provenance and no import-review backlog.

The server-side worker is installed, enabled and running under the existing `become` service account. Backup, deploy and rollback procedures coordinate both database writers. The private production RSA key was generated on the VPS, remains outside the checkout, and is restricted to `root:become` mode `0640`. Only its public certificate was transferred for provider registration. No production database backup or private provider key was downloaded to the development machine.

A separate Become Sandbox application was registered with the exact local callback. Its real sandbox API successfully authenticated and returned the Dutch Mock ASPSP. Browser handoff exposed the provider's actual `tilisy-sandbox.enablebanking.com` consent origin; the adapter was corrected to accept the three exact official consent hosts while rejecting non-HTTPS, embedded credentials, lookalike domains and unexpected ports. The seven new redirect cases passed. The enabled full suite now passes **486 tests**, with the same unrelated 126 tests skipped.

The VPS kernel initially killed inactive-release builds when available RAM was exhausted. Next.js Webpack memory optimization was enabled and a restricted 2 GiB swap file was added after measuring the failure; the existing fstab was backed up before persisting the swap entry. Existing application and worker services remained active throughout the failed inactive builds. The capacity-corrected deployment then succeeded; public privacy/terms returned HTTPS 200, the health endpoint confirmed the new commit and both services were active with zero worker restarts. The deploy procedure now bounds only the build heap to 1536 MiB; the application and worker retain their existing runtime configuration.

Required public `/privacy` and `/terms` pages were added. Both returned HTTP 200 without authentication and were inspected on desktop/mobile. Next.js, its matching ESLint package and DOMPurify were updated to patched releases; the transitive fast-uri patch was refreshed. The production dependency audit reports no known vulnerabilities. Lint, type checking and the production build passed, and all six desktop/mobile/tablet Finance browser journeys passed with the updated dependencies.

The actual sandbox consent test remains pending the owner's explicit approval of Enable Banking's end-user terms. Real bank authorization, account whitelist activation, real Revolut access and exact ING More statement parsing remain unverified and owner-operated. No money was moved and no personal accounts were removed or recreated.
