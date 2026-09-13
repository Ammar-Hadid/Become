# Production-readiness report — 13 September 2026

Become is prepared for a controlled first deployment using the [complete walkthrough](PRODUCTION.md). This is a repository/local-verification result, not evidence of a live production deployment. The VPS, Auctus, DNS, firewall, Neon accounts and external backup storage were not accessed or changed.

## Cleanup performed

- Removed **119 inspected duplicate copies** with ` 2` suffixes: 60 application/source copies, 30 documentation/screenshot copies, 19 duplicate migration files, and 10 E2E/helper copies. **109 were byte-identical.** The other ten were individually diffed and were obsolete versions of the canonical files; no unique required behavior was discarded. Canonical `migration.sql` files, migration directories, legitimate tests, original screenshots and fixtures remain unchanged/preserved. Eighteen identical copies were already untracked when the audit began.
- Removed two confirmed unused files: the Finance form-guard compatibility re-export and the unused Content Home continuation query. TypeScript import-graph inspection found no other unreferenced authored implementation files outside framework entries, fixtures and tests. Reachability is evidence for retention, not proof that every exported symbol is invoked.
- Removed six unused dependencies: the three dnd-kit packages, Hook Form's resolver, React Hook Form, and the OpenAI SDK. These had no source consumers and were reserved for future work. Updated the lockfile; deferred features remain deferred.
- Removed the inactive `.next-e2e` generated cache (approximately 2.1 GB before removal). Regenerated Prisma using its own generator, which removed stale generated copies without manual generated-code edits. Regenerable TypeScript state was refreshed.
- Updated stale current-state documentation and removed user-facing development-phase wording.
- Added targeted dependency overrides for patched `deepmerge-ts` 8.0.0 and `mysql2` 3.23.1. These address the three audit findings in Prisma configuration/optional MySQL dependencies. Prisma generation, full migrations, reference synchronization, build and tests passed afterward. The deepmerge major changes concern Map/mergeInto behavior; Become's static Prisma config uses ordinary object configuration. Revisit overrides when upstream version ranges adopt the patches. [Deepmerge advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [release changes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0), [MySQL advisory](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr)

## Local databases, media and processes

The local Docker PostgreSQL inventory originally contained the personal `become`, two old Phase 6 databases, and a retained Phase 7 walkthrough database. All application tables in both Phase 6 databases were counted before deletion; **every one had zero records**, excluding migration metadata and built-in technologies.

Removed only these confirmed disposable databases:

- `become_phase6_20260912`
- `become_phase6_regression_3f5b7eac78534e3399018f3386ac712a`

Preserved:

- Personal database `become`, with no migrations or data mutations performed by this audit.
- All **49 personal media files** under `.data/become`: **49 referenced keys, zero missing files, zero unmatched files**. The inventory included Season media/previews, COTS selections, Content thumbnails and script images. Nothing in this directory was deleted.
- `become_phase7_3afd9f026b5b4d9e8964545ef80910e5` and `/private/tmp/become-phase7-I0HpzO`, whose documented purpose includes a retained walkthrough account, manual progress and screenshots. Its media root is shared by a regression environment, so that root was not treated as disposable simply because the empty regression database was removed.
- The existing local dev server on 3010, the documented Phase 7 preview on 3028, Prisma Studio, the PostgreSQL container/volume, other applications' containers, and historical QA/recovery artifacts whose continuing value was uncertain. No broad process kill, Docker prune, volume deletion or age-based media deletion was used.

The Compose source now binds future local PostgreSQL starts to 127.0.0.1. The already-running container was deliberately not recreated; its existing 0.0.0.0 port publication is unchanged until a deliberate local Compose restart/recreation. This Compose file is not used in production.

This audit created its own isolated production-verification, Content-verification and restore-rehearsal databases/media. Their final cleanup is recorded in the completion notes below. Browser/setup failures produced only disposable records in those isolated databases.

## Production fixes and security review

- Production rejects a missing/default HTTP auth origin, a known placeholder secret, an invalid database scheme/timezone, E2E build configuration, or a media root inside the release. Configuration errors fail instead of silently writing media into a replaceable release.
- Registration defaults to **closed in production** and remains available by default for local development. `BECOME_ALLOW_SIGNUP` controls both the Better Auth endpoint and the visible UI. The runbook opens signup only behind a temporary Become-only IP restriction and closes it immediately after owner creation.
- Auth requests now recover from rejected network calls and clear their pending state so the user can retry.
- Mutation origin checks use the configured public origin, including its scheme, rather than comparing against an internal reverse-proxy URL. Timer start/pause/resume/complete routes now enforce origin checks too. Auth trusted origins are explicit. Caddy overwrites forwarded IP/host/protocol headers and Next binds only to loopback.
- Server environment validation is separated from browser-imported timezone configuration. The non-secret timezone is embedded consistently for browser and server; changing it requires a rebuild. Production secrets are not `NEXT_PUBLIC_*` variables.
- Additional env-file patterns are ignored by Git; no real env file is tracked. The cleanup did not move credentials into source or logs.
- Existing protections retained: authenticated user-scoped queries and mutations; owned-media reads with private/no-store caching; bounded image uploads; still-raster decoding/re-encoding and pixel/byte limits; immutable exclusive writes; path-key validation; symlink rejection; file permissions; sanitized editor imports; source-text/URL handling and SSRF checks in discovery. Database transaction-scoped advisory locks remain compatible with transaction pooling.
- The runbook uses separate Neon runtime and migration credentials. The runtime role receives DML permissions, not schema ownership. Root-only maintenance credentials are not passed to the app service.
- Prepared dedicated systemd/Caddy/env/backup templates under `ops/production/`. The backup creates coordinated DB/media sets during a brief Become-only stop, restarts on failure, and uploads encrypted copies off the VPS. Retention is explicit and reviewed; no automatic destructive cleanup is enabled.

No TODO/FIXME/HACK/debug logging blockers were found in authored runtime code. Remaining localhost values belong to local defaults, test guards or SSRF rejection logic. Structured operational error logging remains because failures must be diagnosable. Test-only database restrictions/fixtures were retained; the Content migration test was fixed to respect the supplied DATABASE_URL, use the platform temp directory, and remove its own temporary migration files. The pause migration test's temp directory is now platform-independent too.

## Verification

Versions: Next.js 16.3.4, Prisma 7.10.0, PostgreSQL 17 locally, pnpm 11.19.0, and a separately downloaded/checksum-verified **Node 24.21.0 LTS**. The final build/integration runs used Node 24; initial checks also ran on the workstation's existing Node 25.9.0. Production build verification used a separate filesystem copy, not the retained preview's `.next` directory.

| Check | Result |
| --- | --- |
| ESLint, entire repository | Passed |
| TypeScript, entire authored tree | Passed |
| Optimized `next build` on Node 24 | Passed; no build warnings after fixing external-media tracing |
| Baseline unit run | 324 passed; 130 explicitly opt-in integration tests skipped |
| Main Node 24 database/integration run | 434 passed; 20 Content tests skipped by their separate database-name guard |
| Separate Node 24 Content run | 42 passed, including all 20 guarded Content integration/migration tests; overlaps 22 unit tests with the main run |
| Fresh production migration rehearsal | All 38 migrations applied successfully to an empty disposable database |
| Built-in reference-data synchronization | Passed; no demo account created |
| Dependency audit after remediation | Zero known vulnerabilities across all dependencies at audit time |
| Caddy 2.10.2 config validation | Passed using the official native binary and its published SHA-512 checksum; redundant forwarded-header warnings are intentional |
| Backup shell syntax | `bash -n` passed |
| Local paired dump/media restore | Succeeded into a new database; sampled record/migration counts matched and all restored media hashes matched |
| Browser production smoke through actual local HTTPS Caddy | Passed; details below |
| Sol frontend visual review | Desktop Reviews and mobile Content showed no visible rendering/layout blockers |
| Git whitespace check | Passed |

The two integration runs together exercise **all 454 distinct collected tests**, including the guarded suites, without pointing any test at the personal database. This was a relevant production regression run, not a rerun of every historical Playwright scenario.

The production browser smoke used the actual Caddy configuration (with a local test certificate/port) and a restricted, non-owner PostgreSQL runtime role. It verified controlled signup, Secure/HttpOnly session cookies, timer start/pause through an HTTPS proxy, private upload normalization and mode 0600, persistence after app restart, rejection of wrong-origin/wrong-scheme timer writes, signup UI and endpoint closure, failed-login retry, successful existing-account login with signup disabled, desktop Reviews/mobile Content rendering, configured Caddy security headers, and no uncaught browser exceptions. Sol separately inspected both screenshots.

The paired restore rehearsal successfully restored the database and media into fresh local targets. This proves the basic logical backup format and media pairing, not the future Storage Box credentials, timer schedule, retention policy, or full remote disaster recovery.

## Operational prerequisites and known limits

- **No production infrastructure has been verified.** Confirm actual VPS OS, free port/RAM/disk, existing edge-proxy arrangement, domain DNS, Neon TLS/pooling/role grants, systemd sandbox behavior, offsite storage and restore access when deploying. A Linux/VPS build and its smoke tests remain part of the walkthrough. Do not interpret macOS verification as a Linux deployment test.
- Auctus remains separate. If it already occupies public 80/443, Become needs an additional site in that existing edge proxy, not a competing listener or replaced configuration. Unknown existing proxy layouts must be resolved before installation.
- Public self-service registration, email verification and password-reset delivery are not configured. This first deployment is appropriate for controlled personal use with signup closed. Owner password recovery needs a separately reviewed procedure.
- Better Auth's in-memory production rate limit is suitable to the documented single-process arrangement; it resets on restart and is not shared between replicas. Do not add replicas without revisiting auth limiting, media access and caches.
- Strict nonce-based HTML CSP is not implemented. Baseline headers and editor sanitization are present; a future CSP rollout needs editor/Next/print verification. No claim of an exhaustive penetration test is made.
- External discovery providers were not exercised against paid/live accounts. They are disabled deliberately in the first-launch env. Manual media/text still work.
- Better Auth declares an optional Vitest peer range through v4, while this repo pins v5. All tests pass. PostgreSQL's driver emits a future pg@9 concurrent-query deprecation in Prisma transactions; pg remains on v8. These are non-blocking upstream compatibility notes, not suppressed audit findings.
- Historical source/QA artifacts of uncertain value remain. Nothing was deleted just because it had a temporary-looking name or was old.
- New disposable Docker containers did not start on this workstation; they remained in `Created` state and were removed. Caddy validation used the verified native binary instead. No existing containers were restarted or removed.

## Completion notes

Follow [all 14 deployment sections](PRODUCTION.md) for launch, future updates and recovery.

Verification cleanup completed: removed `become_phase7_production_readiness_20260913`, `become_phase6_production_readiness_20260913`, `become_production_restore_20260913`, and their temporary restricted role. Removed the audit's cloned build tree, temporary media, dump/restore sets, inherited env file, TLS keys, downloaded Node/Caddy binaries, test scripts, disposable containers/image, and stalled validation CLI processes. The audit's Next/Caddy servers stopped normally. Final local database inventory is `become`, the retained Phase 7 walkthrough database, and PostgreSQL's `postgres` database.

Non-secret local verification logs, duplicate-removal manifest and screenshots are retained at `/private/tmp/become-production-evidence-20260913` for inspection. This temporary evidence directory is not a durable backup and is not part of the deployment. The durable verification summary is this report. Changes are left uncommitted for review; the walkthrough requires an explicitly reviewed commit before creating the release archive.
