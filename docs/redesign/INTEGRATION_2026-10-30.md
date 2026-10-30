# Approved redesign integration — 30 October 2026

The owner approved the complete redesign and both detail-polish passes. The approved branch ends at `14789d6`. Before integration, the primary checkout was on `factor` at `fc4d6a8`; the redesign had not been merged there.

## Preserve subsequent work

The original checkout contains newer functional-audit fixes and deployment work. Its complete non-ignored file state was saved as `e8fddb86bb32aff655e714ade027f3bff86fb78e`, reachable through `codex/pre-redesign-integration-20261030`. This is a recovery snapshot; no ignored credentials, dependencies or private media are added to it.

Compared with the original pre-redesign snapshot (`66e5535`), 106 paths contain subsequent work. A three-way integration combines those changes with the approved redesign. All application files merge automatically. Seven test/configuration files require resolution:

- Keep the newer arrival helper's actual Not now interaction and wait for its saved response.
- Combine the lint exclusions for generated reports, Storybook, coverage and private data.
- Preserve both redesigned accessible controls and the newer readiness, history-navigation and cold-load checks in Content, Direction, Engineering, Finance and Settings tests.

An independent source comparison reviewed all 14 product files changed by both streams. Bounded requests, draft-preserving reset, document autosave/selection recovery, Safari focus fixes, record-search recovery and the Session history menu remain present alongside the approved layout changes. No further product behavior was introduced for the integration.

## Main checkout state

The approved branch is fast-forwarded into `factor`. Subsequent local work is restored as uncommitted changes from the verified integration tree, retaining its unfinished-work status. A recovery stash is retained as an additional backup. The original redesign and the pre-integration snapshot remain available.

This is local source integration. No remote push, production deployment, schema migration or paid provider call is part of it.

## Verification

- Combined-source production build and TypeScript: passed.
- Full ESLint: passed, excluding the unrelated preserved `node_modules 2` dependency alias in the validation checkout.
- Unit suite: 412 passed, 169 gated tests skipped.
- Integration browser verification: all 23 selected cases passed across the combined run (22 passed) and one focused rerun (1 passed). The rerun updates an old Nexo layout selector in the functional-audit test; product behavior is unchanged. Coverage includes the implemented-route walk, stalled requests, Content, Direction, Engineering, Finance, Settings, record-picker focus and mobile/desktop shared layers.

The duplicate dependency alias was temporarily excluded from TypeScript during validation; the exact original project configuration was restored. Test users are disposable and use the existing cleanup helpers. Browser verification uses the isolated optimized preview on port 3028 before updating the primary checkout.
