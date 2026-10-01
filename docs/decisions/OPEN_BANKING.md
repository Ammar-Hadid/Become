# Finance Open Banking implementation

## Ownership and invariants

Open Banking owns provider adapters, authorization and durable synchronization. Finance owns account policy, normalization, editable interpretation, the ledger, review, goals, recurring commitments, forecasting and qualified reporting. The integration is a modular monolith feature; it introduces neither Redis nor a second ledger.

Connections, external accounts and Become accounts have independent identities. An external CURRENT account mapped to an existing SAVINGS account changes only the ingestion method. The Become ID, nickname, classification, inclusion flag, savings reserves, allocations and relationships remain unchanged. This feature contains no interest model.

FinancialDataSource is LIVE_SYNC, STATEMENT_IMPORT or MANUAL. Historical source is stored on facts and observations. Changing the active account source does not rewrite old provenance. Existing manual transactions default to MANUAL and remain reviewed, preventing a historical import backlog.

## Evidence and interpretation

FinancialEvidenceObservation and FinancialBalanceObservation are immutable imported facts. PostgreSQL rejects updates; provider corrections append revisions. FinancialEvidenceLink associates an observation with a canonical event and records staging, overlap review, supersession or an explicit exclusion. Application actions do not expose raw-fact deletion. User/account/currency relationships use composite foreign keys and service ownership checks.

Booked transactions are projected into the existing FinancialTransaction ledger. Pending observations do not create booked income/expense. Reliable stable references reconcile pending-to-booked changes, including changed amounts. Weaker fingerprints require user decisions and never silently merge identical purchases. Identical unreferenced statement rows require multiplicity decisions in preview. Different stable references within the same source/account preserve distinct events.

A transfer is one canonical event with actual observed movements. A destination relationship is not an invented bank observation. Account position uses source movements and skips derived transfer legs when imported evidence exists. Manual transactions retain their existing two-account behavior. Credit-card purchases are expenses; repayments are transfers. Linked-account card repayment requires an active owned suitable same-currency settlement account. That setting records Become behavior and does not configure the bank's autopay.

Imported transaction amount/date/account/type cannot be manually rewritten or deleted. Counterparty, category, notes, tags, review and relationships remain editable. Corrections preserve canonical IDs and metadata where compatible, reopen review, and invalidate affected attribution/goal completion. Incompatible amounts or directions remain unresolved rather than silently corrupting allocations.

## Concurrency and ingestion

Evidence, mapping, review interpretation and recurring/expected-income matching share a per-user transaction advisory lock. Account/transaction locks use NO KEY UPDATE where key values are stable, avoiding a foreign-key lock upgrade deadlock. Stable evidence keys serialize revisions; database unique constraints enforce reference/payload idempotence.

Statement preview extracts and validates CSV or bounded text PDF outside the projection transaction. Preview creates no ledger events and does not change live analytics/coverage. Users resolve parsing errors and overlaps, then confirmation atomically applies their choices and projects valid rows. Unsupported/scanned/encrypted layouts are rejected. The generic parser is tested; the exact ING More layout is unverified without a representative export. Statement date coverage is the observed transaction range, not proof of an exhaustive statement period.

Provider jobs stage account observations until mapping. Pagination cursors and evidence commit atomically. Mapping promptly projects a bounded initial batch and queues resumable offline materialization for the rest.

## Synchronization and operations

PostgreSQL jobs carry queued/running/succeeded/failed state, triggers, persisted continuation arguments, attempt eligibility and tokenized leases. SKIP LOCKED plus active-job/connection constraints prevent concurrent execution on a connection. A worker rechecks lease/session/connection state after network requests before writing. Lost leases and disconnected/replaced sessions cannot commit stale results.

Provider/institution policy controls cadence, request budgets, interactive-request headers, Retry-After and backoff. The initial six-hour cadence is a configuration default. Sync now uses the same durable scheduler and eligibility constraints. Initial jobs retrieve available history; incremental windows overlap for corrections. Catch-up cannot recover history the provider no longer exposes; coverage remains qualified.

The bank worker is a separate server process with the same database and server-only provider configuration. Deploy, backup and rollback coordinate application and worker writers. No worker is started or production migration applied by this feature's local verification. See [operational setup](../deployment/OPEN_BANKING.md).

## Review and UI

Today and previous unresolved activity are independently counted by Finance activity date in APP_TIMEZONE, with timestamp fallback for existing manual facts. Today is primary; previous activity is collapsed. Unknown counterparties and unresolved evidence are period-labelled. Recognition is independent of human acknowledgement; saving interpretation or a future identity rule does not mark a fact reviewed. Bulk recognized review excludes unresolved identities and uncertain associations.

The same filtered transaction feed supports inline categorization, individual/bulk review and interpretation detail. Original bank details are disclosed separately. Connection health, freshness, reconnect, disconnect and source coverage are available with accounts. Disconnect preserves historical facts. Become nicknames stay primary. Card faces also show the actual mapped institution or explicitly entered bankName, independent of the nickname. Original bank-themed card illustrations carry no invented financial identifiers; Savings remains a reserve illustration.

## Financial projections and reporting

Imported recurring definitions create expectations and match actual evidence; they never synthesize actual bank transactions. Existing manual-account posting behavior remains available. Suggestions require at least three consistent observed transactions and explicit confirmation. Confirmed expected income records preserve specific received occurrences and future recurrence. Refunds do not fulfil expected-income occurrences; converting a receipt to a refund releases its occurrence and requires active payment/business allocations to be corrected first.

Forecasts use qualified balances, confirmed schedules and user-confirmed expected income for 7, 30 or 90 days. Pending amounts are applied once according to balance meaning. Card debt and prospective settlement are kept distinct to prevent double counting. Unallocated after planned payments excludes protected Savings by default without editing stored Savings policy. Net worth is assets minus liabilities per currency; no FX conversion or holdings engine exists.

New imported accounts may start with an unavailable balance. Inline live mapping uses the fetched bank evidence without inventing a zero balance or a newer manual reconciliation. Manual-account creation retains its required observed starting balance.

Goal account links supply evidence only. They do not create money, change allocations or allocate imported funds. Live analytics and bounded Review/Nexo-facing fact contracts carry sources, missing/stale coverage and refunds/net spending. Finalized Review editions and presentation snapshots are unchanged.

## Local verification and remaining setup

The feature is tested against a separate localhost PostgreSQL database, with no personal bank credentials. Acceptance suites cover Savings mapping, independent today/older review, pending-to-booked correction, immutable facts, overlap preservation, transfers, credit cards, recurring matching, deterministic forecasting, ownership and durable job recovery. Browser checks cover responsive interaction and keyboard use. The detailed completion report records exact commands/results.

Provider-mocked flows are not proof of real Enable Banking sandbox consent. Before production use: configure/validate the sandbox flow, then the user performs bank authorization; verify the actual Revolut account; validate the ING-specific layout with a representative redacted export. Opening/closing bank accounts and moving money are separate user decisions.
