# Phase 6: Content, Ideas and Decisions

Implementation approved by the product owner, with the YouTube plan superseded by Content → ContentVariant → Publication → Channel. Parent Astra owns all backend semantics and implementation. The existing Sol subagent's effective runtime was verified as gpt-5.6-sol with xhigh reasoning; Sol owns frontend composition and interaction.

A Content is one creative work. A Variant is a cut, format or language of that work. A Publication is an explicitly recorded release of one variant on one Channel (an owned account on YouTube, TikTok, Instagram or OTHER). Cross-posting one short to three channels remains one Content, one Variant and three Publications. The UI calls variants versions and publications releases. Creating content creates its first version atomically. Stage is production guidance and never publication proof. Pause/archive preserves all creation and release history.

Writing revisions are independent of version lifecycle and media revisions. Optimistic revisions reject stale writes; operation receipts prevent retries creating duplicates. Publication corrections and withdrawal preserve prior snapshots. Manual lifetime observations retain observed time, entry time and correction lineage; latest values are selected separately per metric. Missing is unknown, not zero. Counts never sum snapshots, infer income, distinct viewers, attribution, retention or causal experiment outcomes.

Existing YouTube Domain IDs and activities are renamed in place to Content; historical Session links remain unchanged and no new content attribution is inferred. New sessions can optionally reference an owned Content and a consistent Variant. Time comes from the one existing Session system. Completion never moves stage or publishes.

Global Ideas belong to Direction. Typed many-to-many origin links support Content, Goal and Experiment destinations. Promotion creates the canonical destination and origin atomically, only on deliberate save. Decisions preserve meaningful choices and reasoning, optional owned contexts and user-scheduled review dates. Later reflections and superseding choices retain the original; routine domain changes are not mirrored.

The creator desk and writing workspace are the first vertical slice. Acceptance is Idea → Content → writing/version → linked timer → multiple channels → explicit releases → manual results. Inspect this real browser journey before extending the creator's interaction patterns to media, corrections and analytics. Independently authored Ideas/Decisions and Direction criteria use the same canonical backend contracts, including all three production counts, bounded histories, explicit experiment cohorts and manual-result coverage.

All migration execution and fixtures use an isolated local database in the temporary feature/phase-6 worktree, separate port 3016 and media root. No changes are applied to the original database. No deployment, commit, push, OAuth, paid provider calls, Phase 7 work or external integrations.

## Backend contracts and safety

- Authenticated reads use private/no-store responses. Mutations also require same-origin requests. All child relationships validate owner and parent; composite foreign keys enforce the same boundary in PostgreSQL.
- A work's `workspaceVersion` orders complete workspace responses. Intent, writing, version lifecycle, media and publication revisions provide their own concurrency boundaries. Archive and writing mutations claim the aggregate revision before changing children, so a stale editor cannot write through a concurrent archive.
- Operation receipts retain the exact submission fingerprint and result. An uncertain request must be recovered with its original payload/key before deliberately submitting changed input. This applies to promotion as well as releases and writing.
- Commands return current owned workspaces or Thinking details. Conflicts return the latest owned detail where applicable; the local draft remains available for comparison. Requested versions and releases remain in mutation responses even when beyond the initial page.
- Content, Ideas, Decisions, release corrections, observations and Session history have bounded pages. Stable cursor queries preserve older history; totals come from backend counts rather than the currently loaded page length.
- Latest counters are selected per publication and metric by observation time, entry time and stable ID. Superseded observations and readings preceding the current corrected release date (or exact release time when supplied) are historical only. Withdrawn releases do not qualify for output counts or current evidence. Archive alone does not erase facts.
- Manual Content, release, result and Decision evidence can support a user's qualitative assessment. It does not create platform verification. Previously concluded Goal/Experiment snapshots stay frozen when live evidence changes.
- Thumbnail bytes use a narrowly shared raster normalization/storage foundation with Seasons. Owned still images only, bounded dimensions/bytes, metadata stripped, normalized WebP, private serving and independent media revisions. Content storage is separate from Season/COTS identities. Superseded media rows and bytes remain owned historical records.

## Migration verification

Four additive Phase 6 migrations extend the schema, add Content measurements, add aggregate workspace revisioning, and index Idea origin history. No migration changes have been applied to the original database.

A reproducible opt-in migration test creates its own uniquely named local database, deploys the earlier migrations, inserts structural legacy fixtures with no login account, and tests both collision rollback and successful upgrade through Prisma itself. It verifies that a pre-existing `content`/`youtube` collision rolls the Phase 6 schema changes back, and that an ordinary upgrade preserves Domain, ActivityType and Session IDs and text. Old sessions retain null Content/Variant attribution. It removes only the test database it created.

## Verification record — implementation still in progress

Passed so far:

- Canonical PostgreSQL journey: 14 cases, including concurrent Content/Goal/Experiment promotion and retry, owner boundaries, independent revisions, timer completion, one-work/one-version/three-release output, dated/corrected counters, preserved conclusions, explicit cohorts, Decisions/reflections, media ownership, bounded history and release-date eligibility.
- Publication identity/date units: 5 cases.
- Reproducible migration safety test: 1 case exercising rollback and legacy-data preservation.
- Existing Direction/evidence/Season media integration regression: 21 cases.
- Default unit suite at the latest checkpoint: 173 passed, 102 skipped (opt-in integration suites).
- Combined TypeScript and full ESLint checks passed at the stable Sol checkpoint; `git diff --check` passed.
- Final local production webpack build passed after the combined frontend/backend checkpoint, including TypeScript and route generation; no deployment.
- Anonymous live API checks: protected reads return 401/private-no-store; mutation requests without a valid Origin return 403/private-no-store.

The first authenticated browser journey and E2E suite are **not accepted yet**. Automatic approval review blocked registration of the disposable local browser QA account; a confirmation request is pending. No alternative signup/API workaround is used. Ideas/Decisions and Direction measurement UI have reached a stable implementation checkpoint, with browser acceptance still pending.

Remaining work after that browser checkpoint:

1. Inspect the complete creator journey on desktop and mobile, including writing recovery, timer linkage and one-work/one-version/three-release identity. Adjust the interaction patterns from actual browser evidence.
2. Complete creator media upload/remove, bounded collection/history navigation, release correction/withdrawal/restoration, observation corrections, Content/version archive controls and channel management over the implemented backend contracts.
3. Add the authoritative Content analytics surface and sparse Home continue/Idea entry points.
4. Run the remaining browser acceptance and regression checks, update this record, and review the final diff. Phase 6 is not complete until these steps pass.

Commands for an explicitly isolated local Phase 6 database, from this worktree:

```bash
RUN_CONTENT_INTEGRATION=1 pnpm exec vitest run src/features/content/services/content.integration.test.ts src/features/content/publications/utils/publication-identity.util.test.ts
RUN_CONTENT_MIGRATION_INTEGRATION=1 pnpm exec vitest run src/features/content/services/content-migration.integration.test.ts
pnpm typecheck
pnpm lint
```

The integration guards require a loopback database whose name begins with `become_phase6_`. Browser E2E account creation remains gated by the pending confirmation. All changes remain uncommitted on `feature/phase-6` in `/private/tmp/become-phase-6-planning`.
