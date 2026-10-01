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

The owner subsequently approved Enable Banking's sandbox end-user terms. The actual provider sandbox consent and synchronization test is recorded below. Real bank authorization, account whitelist activation, real Revolut access and exact ING More statement parsing remain owner-operated and are not established by this sandbox test. No money was moved and no personal accounts were removed or recreated.

The approved production **Become** application was registered with Account Information access and the exact deployed callback. Its application ID and server-side key path were installed in the restricted production environment, preserving other configuration and a restricted backup. The registered certificate matches the VPS private key. Application and worker restarted successfully; both were active and the worker reported zero restarts.

At the initial readiness check, the provider application was **Inactive**, awaiting the owner's **Activate by linking accounts** control-panel step. An authenticated institution-catalog request returned HTTP 403. This exposed an uncaught catalog failure on the connections page; the follow-up fix returns bounded readiness states and preserves the rest of the page. Six focused regression cases cover missing setup, successful discovery, 401/403 denial, provider failure and transport failure without exposing provider details. Real consent was not initiated.

## Actual provider sandbox consent — 1 October 2026

After the owner's explicit terms approval, the separate **Become Sandbox** application completed the real Enable Banking consent redirect through **Rabobank Developers Sandbox**. The bank page explicitly described simulated consent and sandbox-only tokens. No personal bank credentials or real bank consent were used by the agent.

This exercise exposed three adapter boundary defects: the provider returns `null` for an unused `account_id.other` and unavailable balance `reference_date`, and rejects `date_to` without `date_from`. Optional identifiers/dates now normalize absent values without inventing bank details; invalid metadata and required financial values remain rejected. Initial history requests omit an unpaired end date while preserving the longest-history strategy and continuation key. The provider's [documented error and transaction strategy](https://enablebanking.com/docs/api/reference/#get-account-transactions) confirm that contract.

The consent callback discovered four simulated EUR CURRENT accounts. The durable job resumed its persisted cursor after the corrections and succeeded, staging two balance observations per account. One external CURRENT account was mapped through the browser to a Become SAVINGS account named **Sandbox reserve**, with liquid-Savings inclusion enabled. The native **Sync now** action queued a second durable job. Both jobs succeeded; account identity and classification remained intact. Browser disconnect then revoked the sandbox session while retaining the Become Savings account and all 16 historical balance observations from the two synchronization runs.

Rabobank's current sandbox returned zero transactions for these four accounts, with no continuation key. This verifies consent, discovery, qualified balance ingestion, empty-history completion and repeat synchronization, but does not establish transaction-bearing live pagination or real-bank coverage. Transaction pagination, deduplication, pending/booked changes and statement/live overlaps remain covered by controlled PostgreSQL integration fixtures. The known validation-error retry was advanced only in the disposable test database after its cause was fixed; production cadence and provider rate-limit instructions were unchanged.

Five new regression cases first failed against the original adapter and passed with the correction: nullable account identifiers, nullable transaction counterparty identifiers, an unavailable balance reference date, and unpaired history end dates on the first/continuation page. Temporary field-type diagnostics were removed before release.

The final corrected suite passed **83 files / 497 tests**, with 126 unrelated tests skipped; Finance and Open Banking PostgreSQL integration flags were enabled. Repository lint, type checking and production build passed. The browser verified the mapped account's nickname, Savings classification, liquid-Savings inclusion, source freshness and retained history after revocation.

A subsequent read-only check using the configured production application successfully retrieved the institution catalog: ABN AMRO, ING and Revolut were listed. This establishes production catalog entitlement only; the owner's actual account consent, synchronization and Revolut account coverage remain separate verification steps.

## ABN AMRO optional-metadata correction — 1 October 2026

After the owner completed real ABN authorization and mapped the discovered account to their existing Become account, the connection was CONNECTED but its first synchronization was queued with `INVALID_PROVIDER_DATA`. A bounded server-side diagnostic inspected validation paths and JSON types only. No provider payload, account balance, transaction amount, counterparty name, account identifier or credential was copied to local fixtures or diagnostic logs.

ABN returned `null` for optional balance `last_change_date_time` and transaction `value_date`, `creditor`, `debtor`, `creditor_account`, `debtor_account` and `reference_number`. These were previously treated as omitted-only fields. All declared optional metadata now accepts missing or null values consistently; amounts, currencies, directions, statuses, stable account identities and malformed non-null metadata remain validated. A transaction without any activity date remains rejected rather than being assigned an invented date. Existing nullable transaction reference handling is preserved to avoid changing fingerprints of already accepted observations.

The adapter validates each original balance/transaction entry through its normalizer instead of transforming entries before evidence capture. This retains the untouched JSON, including null fields, while normalized interpretation sees unavailable metadata as absent. Pagination and financial-domain policies are unchanged.

Thirteen synthetic regression cases cover nullable metadata, original-payload preservation, consistent fingerprints for newly supported missing fields, unknown counterparties and rejection of invalid required facts. Six cases reproduced the original failure before correction. The corrected applicable suite passes **83 files / 510 tests**, with Finance and Open Banking PostgreSQL integration flags enabled and 126 unrelated tests skipped. Type checking, repository lint and the production-shaped build pass. Actual resumed production synchronization is a separate post-deployment check; no new consent is required by this fix.

## Cash wallet artwork — 1 October 2026

Cash accounts now use an original brown leather wallet illustration instead of the generic payment-card face. The shared account-artwork component selects Cash before issuer matching, retains the wallet's transparent silhouette, and omits the entire copy layer for Cash. The account name remains in the existing account-row label and detail heading. Wallet artwork contains no account name, Cash label, bank-name prompt, institution, card identifiers, network marks or chip. Other bank-card and Savings artwork behavior is preserved. No account records, classifications, balances, ledger data, typography tokens or interactions are changed.

The project asset is [cash-wallet.webp](../../public/finance/account-artwork/cash-wallet.webp), optimized to 1200 × 756 with alpha preserved. It was created using the built-in image-generation tool. [The rendered preview](open-banking/cash-wallet-no-text-preview.jpg) uses a disposable local account and synthetic balance. Cash overview/detail inspection confirmed the illustration loads and its artwork DOM has no text/copy layer; normal account labels remain present. All six existing Finance browser journeys passed across Chromium desktop, iPhone/WebKit mobile and iPad/WebKit tablet, including bank-card nickname/issuer checks and Savings mapping.

<details>
<summary>Exact artwork generation prompt</summary>

Create one original, polished illustration asset for the Cash account in a premium personal finance web app. Subject: a real physical brown leather cash wallet / billfold, unmistakably a wallet, never a debit or credit card. Wide front-facing composition with a very slight three-quarter angle so the folded spine and soft leather gusset are visible. Deep warm cognac leather, fine tactile grain, hand-stitched perimeter seams, layered rounded leather edges, a small closure flap and warm metal snap on the far right. A few restrained neutral sage/ivory banknote edges peek out of the top, without numbers, lettering, currency denominations, emblems or identifiable legal-tender designs. The front leather panel is broad, calm and uncluttered, especially middle-left and lower-left: actual account name and Cash label will be overlaid in code and must remain legible there. Illustration style: realistic crafted material with elegant drawn shading, subtly stylized, sophisticated rather than cartoonish. Wallet occupies about 90% of a wide horizontal canvas, centered with breathing room for edges and a very subtle contact shadow. Genuine transparent background. Standalone object only; no scene, hand, desk, UI or background panel. No text anywhere. No bank branding, no payment network logos, no chip, no card numbers, no card-shaped object protruding. Show the wallet's fold, flap and seams clearly at small sizes. Intended for approximately 1.59:1 account artwork slot, displayed at both 420px wide and compact 132px wide.

</details>

Repository lint, TypeScript and the production-shaped build passed. The regular unit suite passed 77 files / 452 tests; 184 tests requiring separate integration flags were skipped. No new tests were added for this reversible artwork change.

The initial prompt reserved space for live labels. The owner's subsequent instruction removed every wallet overlay; the generated bitmap itself was already text-free and required no image edit.
