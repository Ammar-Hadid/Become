# Current development state

Phase 2: Engineering is implemented on `feature/phase-2`.

## Available now

- Phase 1 authentication, domains, timer recovery, session history, and calendar-aware analytics
- Engineering projects with required context, lifecycle state, dates, archive/restore, repository URL, nullable `liveUrl`, and optional reusable technology stacks
- Curated global technologies plus normalized user-owned custom technologies
- Developer-owned built-in catalog with explicit, atomic `pnpm db:sync-reference` synchronization through Prisma seeding
- Optional project selection on Engineering sessions
- Required, session-owned Engineering context: Uni, Internship, Personal, or Professional
- Engineering evidence linked to a session, project, both, or neither where appropriate
- Engineering overview analytics by timeframe, project, activity, context, active day, and evidence type
- Project-associated technology time, explicitly presented as overlapping project metadata rather than direct session attribution
- Distinct projects worked on in the selected timeframe, grouped by project context separately from Session-context time
- Unsaved-change confirmation for modified project create/edit forms
- Responsive project, evidence, timer, and session-detail experiences

Session context is the historical source of truth. It is never inferred from a
project, so context remains valid when there is no project and cannot be changed
retroactively by editing a project. Selecting a project when starting a session
prefills that project's context only as an editable convenience.

Technologies are attached only to projects. A session never asks for or stores a
technology, keeping timer capture lightweight and preventing claims that the
available data cannot support. Phase 2 analytics use each project's current
technology stack; they do not snapshot that stack onto historical sessions.

## Intentional boundaries

- Pre-Phase-2 Engineering sessions keep a null context rather than receiving a guessed value.
- Projects created before required project context are backfilled as Personal and can be corrected through the edit form; no Session values are used to infer that backfill.
- Only active, non-archived projects appear in the timer selector; archived projects remain attached to historical sessions.
- Project-context analytics use each project's current context and count a distinct project only when a linked Session overlaps the selected timeframe; project context is not snapshotted per Session.
- Completed sessions are not editable or deletable yet.
- Finance and later product phases are not implemented.

## Verification

- Prisma schema validation and client generation
- Phase 2 migration applied to local PostgreSQL
- TypeScript, ESLint, and deterministic unit tests
- Next.js production build with webpack
- Engineering Playwright journey on desktop, tablet, and mobile
- Existing timer and session-detail Playwright regressions in Chromium
