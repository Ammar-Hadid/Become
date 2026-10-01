# Open Banking setup and operations

Become uses a server-side Enable Banking adapter and a durable PostgreSQL-backed worker. Finance remains one ledger; bank observations and imported statements are immutable source evidence, while recognition, categories, notes, tags and human review belong to Become. No bank login password is stored in Become.

## Personal provider setup

1. Register a sandbox application in the [Enable Banking control panel](https://enablebanking.com/docs/api/reference/#certificate-upload-and-application-registration). Register the exact callback URL `<BETTER_AUTH_URL>/api/open-banking/callback`.
2. Generate/export an RSA key and upload the matching public certificate. Store the private key outside the checkout. In production use `/etc/become/enable-banking-private.key`, owned `root:become`, mode `0640`. Never put it in browser code, Git, screenshots or logs.
3. Set `ENABLE_BANKING_APP_ID` and `ENABLE_BANKING_PRIVATE_KEY_PATH`. The adapter generates short-lived RS256 JWTs identifying the application, not the user.
4. Test connection, bank authorization, account mapping, pagination, reconnect and revocation using sandbox data. Sandbox and production application registrations are separate.
5. Register a production application and whitelist only the owner's personal accounts through the provider control panel. This control-panel step is separate from Become's bank authorization. Confirm personal eligibility and cost against [provider terms](https://enablebanking.com/terms/) before activation.
6. Record the actual provider monthly cost in `OPEN_BANKING_MONTHLY_COST_EUR`. Become rejects values above EUR 10; it never purchases a provider subscription.
7. Authorize the bank through Become and map the returned external account to its existing Become account. Mapping retains the Become name, classification, Savings inclusion, reserves and goal relationships.

Live production coverage must be tested with the actual owner's consent. ABN and ING current accounts are the initial supported targets. Discover Revolut under both NL and LT; a listed institution is not proof that a Dutch user's account is accessible. ING Credit Card More initially uses statement imports, and its specific parser is verified only after testing a representative redacted export. Do not present personal ABN savings or ING More as confirmed live API coverage.

## Worker installation

The application server alone does not run scheduled jobs. The worker runs separately against the same database and deployed release:

```sh
./node_modules/.bin/tsx src/features/open-banking/sync/services/bank-worker.service.ts
```

Locally, `pnpm bank:worker` loads `.env` with dotenv. In production, install the supplied `ops/production/become-bank-sync.service` as `/etc/systemd/system/become-bank-sync.service`, reload systemd, then enable/start it after sandbox verification and credential setup. It runs as `become` and reads `/etc/become/production.env`. The deployment installation script installs the unit but does not enable it automatically.

The unit requires the release's `tsx` runtime, installed by the existing production deploy's `pnpm install --prod=false`. Its `ConditionPathExists` permits rollback to older releases without launching a nonexistent worker. Keep private-key read permission restricted to the service account.

## Cadence, retries and recovery

`OPEN_BANKING_SYNC_INTERVAL_SECONDS` defaults to `21600` seconds. Provider/institution overrides are seconds keyed by exact provider/country/name:

```text
OPEN_BANKING_INSTITUTION_CADENCE_JSON='{"ENABLE_BANKING:NL:ING":21600}'
```

The six-hour default is integration configuration; Finance calculations do not depend on it. Choose overrides only within actual bank/provider limits. Enable Banking quota responses without explicit retry instructions use its documented six-hour fallback. Explicit `Retry-After` instructions take precedence. Transient failures use increasing retry intervals. The Finance “Sync now” action enqueues the same durable work and shows its deferred state when rate-limited; it does not bypass quotas or pretend that the user remains online in a background job.

Jobs persist account scope, fixed date bounds, page continuation, attempts and leases. Evidence ingestion and each cursor advancement commit together. An empty page with a continuation is followed. A failed or interrupted job resumes from its last committed page, and an expired lease can be reclaimed. Scheduled catch-up fetches overlap for bank corrections and includes the last-success downtime boundary. Reauthorization starts fresh full-history retrieval using the bank's actual consent duration. Excluded accounts retain history and mappings but are not fetched through an old session handle.

Initial history is retrieved before account mapping and staged for later projection, preserving the post-authorization full-history window. No-reference rows preserve multiplicity and require conservative overlap review rather than fingerprint-only financial-event merging. User absence is never represented with persisted browser/PSU headers.

## Maintenance and diagnostics

The shared VPS deploy script bounds the Node build heap to 1536 MiB and enables Next.js Webpack memory optimization. The verified 4 GiB host additionally required a restricted 2 GiB swap file for transient native build allocations. This is build capacity, independent of Finance or synchronization policy. Keep adequate headroom for the existing services when deploying; these settings do not change the application or worker heap.

Backups, deploys and rollbacks stop the active bank worker together with the application. Their cleanup paths restore whichever services were active. All other writers, including Prisma Studio and manual migration/SQL sessions, must also be stopped during paired backups. Do not run the worker from a second checkout against production while maintenance is in progress.

Inspect `journalctl -u become-bank-sync.service` for worker health. Logs omit provider bodies, tokens and account identifiers. Account details show last successful synchronization, consent expiry, connection state and the latest queued/running/failed job. Retry instructions are persisted on the connection and job so restarts cannot bypass them.

Disconnect stops local synchronization and retains history. If remote consent revocation fails, Become reports the failure and the user can retry or revoke access inside their bank. Real bank authorization, provider signup, moving funds and deployment remain user-operated setup steps.

## Statement workflow and limits

Create ING More as a credit-card account with Statement import as the initial ingestion method. Repayment configuration is independent: linked/automatic repayment requires an active owned same-currency settlement account, while manual repayment does not. Account details let you update evidenced or explicitly entered card limits, statement amounts and due dates without replacing the account.

Upload CSV/TSV or a text PDF of at most 2 MB. CSV lets you map date, amount, description, counterparty, reference, currency and direction columns. Choose what positive amounts mean when a file lacks explicit debit/credit markers. PDF extraction is limited to 100 pages and supports strict dated transaction lines; scanned, encrypted or unsupported layouts are rejected rather than guessed. CSV imports are limited to 5,000 rows per file.

Preview shows validation errors, raw amounts and possible overlaps. Resolve every error/overlap before confirming; draft previews create no ledger events and do not change live coverage. Identical unreferenced rows require an explicit Keep as new or Leave row out decision. Attaching a row to an existing event preserves its ID and interpretation. Confirmation shows imported activity coverage, and repeated confirmed files are idempotent.

The observed first/last transaction dates do not prove an exhaustive statement period. Missing dates, unsupported layout and subsequent activity qualify forecasts. Generic CSV and actual text-PDF extraction are verified with synthetic fixtures. Exact ING More parsing remains unverified until tested with a representative redacted export. Never label that fixture or any bank connection verified until it has actually been checked.

## Verified local scope

See [verification](../development/OPEN_BANKING_VERIFICATION.md), [architecture](../decisions/OPEN_BANKING.md) and [research](../research/OPEN_BANKING.md). No real bank credentials, consent, account opening/closure, money movement or production deployment were performed as part of local implementation.
