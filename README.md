# Become

Become is a calm personal operating system for connecting intention, focused time, outcomes, and direction. This repository currently contains **Phases 1–7: Foundation, Engineering, Finance, Entrepreneurship, Seasons & Direction, COTS discovery, Content/Ideas/Decisions, and Reviews**.

## What Phase 1 includes

- Email/password authentication with Better Auth
- Personal, configurable domains and activity types seeded on signup
- A single global timer with persistent pause/resume and refresh recovery
- Lightweight start and stop flows with optional intention, outcome, and notes
- Session history and domain views
- Week, Month, Season, and Year focused-time analytics
- Fixed calendar seasons and Europe/Amsterdam-aware period boundaries
- Responsive desktop/mobile interface using the Become dark visual system
- Deterministic business-logic tests and a Playwright timer journey

## What Phase 2 adds

- Engineering projects with their own required context, status, dates, notes, repository URL, optional nullable live URL, and reusable technology stacks
- Optional project linkage on Engineering sessions
- Required session-owned Engineering context: Uni, Internship, Personal, or Professional
- Engineering activities focused on what happened: Coding, Debugging, Architecture, Learning, Testing, Deployment, and Code review
- Evidence records for features, bugs, concepts, deployments, architecture decisions, and technical discoveries
- Engineering analytics by activity, context, project, timeframe, active days, and evidence type
- Carefully labeled time on projects using each technology, without claiming session-level technology attribution
- Distinct projects actually worked on in a timeframe, grouped by project context
- Unsaved-change protection on project create and edit forms
- Dedicated responsive Engineering overview, project, evidence, and historical session-detail flows

## What Phase 3 adds

- Dedicated Finance overview, accounts, transactions, savings, recurring, and Work & Opportunities pages
- Exact integer money and currency-aware manual income, expense, and same-currency transfers
- Account balances derived from reconciliation snapshots plus subsequent flows, including unavailable-position states
- Cursor-paginated transaction and reconciliation history with explicit corrections
- Responsive application Settings and per-currency protected savings reserves
- Savings goals, atomic allocation plans, partial goal spending, independent allocation release, underfunding and completion review
- Weekly/monthly/yearly recurring expenses with clamped month ends, snapshotted occurrences, confirmation or explicitly authorized automatic posting, and bounded idempotent catch-up
- Work sources, prospective opportunities, and explicit accepted-opportunity create/link/not-now choices
- Finance timer metadata, payment-first many-to-many attribution, completeness review, and confirmed linked hourly rates
- Week/Month/Season/Year cash movement, work, opportunity and position analysis, with deterministic Needs Attention

COTS discovery uses category-specific external sources; credentialed adapters require setup. AI, Gmail, and social-platform integrations remain deferred. Finance has no bank integration or FX conversion.

## Content, Ideas and Decisions

Content connects one creative work → variants → explicit releases → owned channels, with linked Sessions and manual dated results. The dedicated rich script editor supports autosave, conflict recovery, formatting, owned images, tables, find/replace, DOCX/TXT import/export and printing. Owned thumbnails, release corrections and bounded histories are implemented. Ideas and the Decision Journal preserve origin links, choices, reasons and later reflections. See [Phase 6 decisions](docs/decisions/PHASE_6.md).

## Reviews and Season transitions

Week, Month, Season and Year reviews combine domain-qualified facts, optional writing, source drill-through and defining moments. Finalization preserves immutable editions; source corrections change the live reading and explicit amendments retain earlier editions. A participating prior Season can unfold into a four-movement finale and the existing next-Season opening, with direct numbered scene navigation, manual progress, deferral, skip and replay. Reduced motion uses the same ceremony without animation. First-time users retain direct opening; active work suppresses automatic arrival.

The versioned Phase 8 foundation provides bounded period facts, current context, typed retrieval and a source-grounded COTS persona-profile contract. No profile research, inferred personality, AI calls or generated farewells run in Phase 7. Generic Direct/Harsh/Ruthless settings are removed. See [Phase 7 architecture, verification and manual acceptance](docs/decisions/PHASE_7.md).

The Phase 7 migration has been verified on isolated local databases. Applying it to an existing personal installation is a separate explicit local migration step; implementation testing did not modify personal records.

## Stack

Next.js App Router, React, TypeScript, PostgreSQL, Prisma, Better Auth, Tailwind CSS, shadcn-style local primitives, Simple Icons, Zod, Recharts, Luxon, Vitest, and Playwright. `dnd-kit`, React Hook Form, and the official OpenAI SDK are installed for their specified future uses but are not forced into flows that do not need them.

## Run locally

Requirements: Node.js 24+, pnpm, and Docker (or a PostgreSQL 17-compatible database).

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:sync-tech
pnpm dev
```

Open [http://localhost:3010](http://localhost:3010), create an account, and the default domains will be created automatically. Become uses port 3010 so it can coexist with services that commonly occupy port 3000.

## Commands

```bash
pnpm dev            # local development
pnpm build          # production build
pnpm lint           # ESLint
pnpm typecheck      # TypeScript
pnpm test           # deterministic unit tests
pnpm test:e2e       # desktop/tablet/mobile journeys (database must be running)
pnpm test:finance:integration # real local PostgreSQL constraints and races
pnpm db:migrate     # apply/create Prisma migrations
pnpm db:seed        # sync reference data, then ensure demo domains if the user exists
pnpm db:sync-tech # synchronize built-in reference data only
pnpm db:studio      # inspect local data
```

Install Playwright's Chromium browser once if it is not already present:

```bash
pnpm exec playwright install chromium
```

## Architecture

- `src/app` contains thin Next.js route and composition files.
- `src/features/dashboard` owns command-center UI, types, and deterministic aggregation queries.
- `src/features/engineering` owns Engineering projects, evidence, session extensions, validation, services, queries, and analytics.
- `src/features/finance` owns accounts, transactions, savings, recurrence, work sources, opportunities, payment attribution, and Finance analytics.
- `src/features/reviews` owns shared period facts, frozen editions, writing, evidence drill-through and bounded retrieval. Domain qualification stays with each domain.
- `src/features/seasons` owns identity, curated COTS media, opening and finale lifecycle, including versioned persona inputs.
- `src/features/content` owns creative works, variants, releases, thumbnails, scripts and manual analytics; Direction owns global Ideas and Decisions.
- `src/features/settings` owns the application Settings shell.
- `src/lib/money` owns exact decimal parsing, formatting, currency validation and integer allocation.
- `src/features/sessions` owns timer/session components, queries, schemas, mappers, services, and types.
- `src/features/domains` owns initial domain configuration, domain queries, and seeding behavior.
- `src/features/auth` owns the authentication UI.
- `src/components/layout` and `src/components/ui` contain genuinely shared application shell and UI primitives.
- `src/lib/auth`, `src/lib/db`, `src/lib/dates`, and `src/lib/config` contain cross-cutting infrastructure and primitives.
- `prisma/schema.prisma` defines the relational source of truth.

Feature roots and nested concerns contain responsibility or role folders.
Implementation files live in role folders, with roles also expressed in filenames
(for example, `*.query.ts`, `*.service.ts`, and `*.component.tsx`). Existing role
folders are leaves; they do not need another layer of the same folder name:

- Engineering groups analytics, projects, evidence, technologies, and session
  extensions by concern. `projects/` contains `actions/`, `services/`,
  `components/`, and `hooks/`. `technologies/` contains `components/`, `constants/`,
  `services/`, and `utils/`, with catalog, synchronization, and normalization
  tests beside the source they cover. Analytics separates `components/`,
  `queries/`, and `utils/`.
- Engineering queries, schemas, types, and constants that span multiple concerns
  remain together in feature-local `queries/`, `schemas/`, `types/`, and
  `constants/` folders.
- Sessions groups active-timer UI, state, and elapsed-time tests under `timer/`,
  historical detail UI and state under `details/`, and start/complete services
  under `lifecycle/services/`. Timer and detail concerns separate `components/`
  and `hooks/`; elapsed-time logic and tests live under `timer/utils/`.
  Shared session queries, schemas, mappers, and types keep
  their own responsibility folders.
- Domains keeps initial configuration and seeding under `defaults/`, slug and
  link helpers under `identity/utils/`, and reads under `queries/`. Defaults
  separates `constants/` and `services/`.
- Dashboard aggregation and its result types live under `analytics/queries/`
  and `analytics/types/`.
- Shared layout groups the app shell and branding; shared UI groups buttons,
  charts, and styles. Infrastructure separates auth configuration and queries,
  database adapters, date utilities, and styling utilities within their owners.
- Each feature owns its CSS under `styles/`. Related unit tests remain beside
  their source; browser journeys remain under `e2e/`.

## Maintaining built-in Engineering technologies

The canonical developer-owned catalog is
`src/features/engineering/technologies/constants/engineering-technology-catalog.constants.ts`.
Each entry stores a permanent ID plus editable name, slug, category, and nullable
icon key. IDs are intentionally independent of mutable slugs. Categories use the
existing `engineering-technology.constants.ts`; aliases remain normalization
rules in `engineering-technology.util.ts`, not extra catalog entries.

To add a technology such as Hono:

1. Add an entry with a new permanent ID (for example `builtin-tech-hono`), display
   name, canonical slug, and existing category. Use `iconKey: null` if no icon is
   available.
2. If an icon is available, add its named Simple Icons import and stable key to
   the registry in `engineering-technology-icon.component.tsx`, then use that key
   in the catalog. Store neither SVG markup nor icon objects in the catalog or
   database. Null and unknown keys use the existing Lucide fallback.
3. Add useful aliases only if needed, then run `pnpm db:sync-tech`.
4. Check the sync summary, resulting row (`pnpm db:studio`), and project selector.

The command uses Prisma 7's explicit seed configuration in `prisma.config.ts`.
It runs only required reference-data maintenance; `pnpm db:seed` also retains
the existing optional demo-domain seeding. There are no request-time or
application-startup synchronization writes.

Synchronization is atomic and matches built-ins by stable ID. It creates missing
entries, updates changed canonical metadata, and leaves identical rows alone.
It never changes IDs, project joins, or user-owned custom technologies, including
custom rows with the same slug. An ID ownership conflict or a built-in slug owned
by another ID fails safely instead of adopting, merging, or replacing a row.
Resolve these exceptional cases deliberately; slug swaps may require an explicit
new data migration. Do not change a catalog ID to rename a technology.

Removing an entry from the catalog does **not** delete or retire its database
row. Unlisted built-ins remain preserved and selectable. Phase 2 has no retirement
state; disabling selection would require a separate explicit lifecycle change.
The original technology migration remains immutable historical evidence. Never
edit an applied migration to add or maintain normal catalog entries.

For a future controlled deployment, generate the client during preparation,
apply migrations with `pnpm exec prisma migrate deploy`, run
`pnpm db:sync-tech`, then deploy/start the application. The maintenance
environment needs the Prisma/tsx tooling and its own securely supplied
`DATABASE_URL`; production credentials do not belong in local development.
Run one maintenance job at a time; a concurrency conflict fails the transaction
and can be retried safely. No deployment pipeline is introduced here.

Focused PostgreSQL integration tests are opt-in and roll back all fixtures:

```bash
RUN_REFERENCE_DATA_INTEGRATION=1 pnpm exec vitest run src/features/engineering/technologies/services/synchronize-built-in-technologies.integration.test.ts
```

They require a migrated local PostgreSQL database. Ordinary unit tests remain
database-independent.

## Core business rules

- PostgreSQL timestamps are canonical UTC instants; calendar interpretation uses `APP_TIMEZONE`.
- Season dates are derived fixed quarters; user-owned opening, identity and closing records attach to those quarters without replacing calendar calculations.
- A partial unique PostgreSQL index guarantees only one unfinished product session per user, whether running or paused. End it before starting another timer.
- A product `Session` is distinct from Better Auth's `AuthSession`.
- An activity must belong to the selected domain and that domain must belong to the authenticated user.
- Every new Engineering session stores its own context independently of its optional project; that session value is authoritative history.
- Selecting a project may prefill its context when starting a timer, but the Session context remains editable and is stored independently.
- Technologies are reusable project metadata only; they are never required or stored on timer sessions.
- Engineering projects and evidence are user-owned, and cross-user or cross-domain relationships are rejected at the database and service boundaries.
- Durations are clipped to analytics boundaries, including sessions crossing midnight, weeks, months, seasons, or DST changes.
- Pause intervals are excluded from focused time, analytics, and Finance hourly rates. Resuming retains the same session and context. Pauses persist until explicitly resumed or ended, including after closing the app.
- The database is truth. The current Phase 1 “recent signal” is deterministic copy, not an AI claim.

## Known boundaries

- Dashboard layout is intentionally fixed; persisted drag/reorder/resize begins only when customization is prioritized.
- Completed session timing cannot be edited or deleted. Finance metadata and payment completeness have narrow correction flows; Engineering context and project can be corrected before stopping an active session.
- Engineering projects can be edited and archived, and evidence can be edited; permanent deletion is intentionally not exposed.
- Project forms use browser confirmation rather than drafts or autosave when modified data would be discarded.
- No password reset or email verification delivery is configured for local personal use.
- There is no rate-limit adapter yet; deployment should add an infrastructure-appropriate limiter to auth and mutations.
- Foundation and Engineering analytics show the current period and its previous equivalent. Finance also supports selecting a historical reference date.

Further product phases remain governed by `docs/product/MASTER_SPEC.md` and are not included in this implementation.

## Pausing a session

Use **Pause** on Home or in the global session controls. Home keeps the session
visible with its frozen focused time, **Resume**, and **End session**. Ending a
paused session opens the usual optional outcome/notes/evidence form; the session
stays paused while filling it out or cancelling. Completed details distinguish
focused time from excluded break time.

Session lifecycle changes are transactional and return revisioned server state.
Other tabs reconcile through invalidation and on focus; a refresh or retry cannot
restore an older timer state. There are no timer-tick database writes.

Apply the additive migration with `pnpm exec prisma migrate deploy`, generate the
client with `pnpm db:generate`, and restart a running development server to load
the updated Prisma client. Historical sessions without pauses are unchanged.

Focused PostgreSQL checks create and clean up isolated fixtures:

```bash
RUN_SESSION_INTEGRATION=1 pnpm exec vitest run src/features/sessions/lifecycle/services/session-lifecycle.integration.test.ts
RUN_SESSION_MIGRATION_INTEGRATION=1 pnpm exec vitest run src/features/sessions/lifecycle/services/session-migration.integration.test.ts
BECOME_E2E_PORT=3021 pnpm exec playwright test e2e/session-pause.spec.ts e2e/timer.spec.ts e2e/timer-recovery.spec.ts
```

The migration check uses and removes a disposable local PostgreSQL database.
`BECOME_E2E_PORT` gives browser tests a separate Next.js output directory so they
can coexist with the normal development server.

## Finance semantics and verification

The Phase 3 contract is [PHASE_3_FINANCE.md](docs/product/PHASE_3_FINANCE.md),
with implementation notes in [phase-3-implementation.md](docs/decisions/phase-3-implementation.md).

An account has no authoritative `currentBalance` or `openingBalance`. Its latest
reconciliation at or before an instant anchors that balance; only transactions
strictly after the anchor contribute. Transactions at the reconciliation instant
are considered included in the observation. Missing anchors mean unknown, never
zero. Historical savings comparison uses current account inclusion settings;
Phase 3 does not record an inclusion-policy or savings-allocation timeline.

Savings allocation is current intention, while goal spending is confirmed expense
attribution. Spending, reserve edits and balance corrections can expose
underfunding without changing allocations. Completing a goal never creates an
expense or silently releases savings. Changes to a completed goal's spending
flag completion for review.

Recurring automatic posting records the user's scheduled assumption; it is not
bank verification. An authenticated action checks due expenses on Finance entry;
there is also a Check due expenses button. Processing uses bounded batches and
unique occurrence/posting keys. This does not guarantee background execution.
Deleting a generated expense reopens its occurrence for manual confirmation.

Work dates, payment dates and attribution completeness have separate meanings.
Only earned-work income can fund completed Paid Work sessions. Rate calculations
use confirmed allocations over overlapping work, even when payment falls outside
the selected period. Unresolved attribution and mixed currency never produce a
fabricated rate. Candidate work searches are bounded and include existing links.

Run `pnpm test:finance:integration` against local PostgreSQL after applying
migrations. It creates isolated test users, exercises actual foreign keys and
concurrent allocation/recurrence mutations, and cleans up fixtures. Finance
Playwright tests likewise clean up their own users. No bank credentials are used.

## Entrepreneurship (Phase 4)

Open `/entrepreneurship` to start or continue a niche exploration. Each workspace
has Overview, Companies, Interactions, Problems and Offers; new records and timers
inherit its context. Pause/stop decisions retain the exploration under past history.
Global history remains available at `/entrepreneurship/history`. Timer activity
never invents contact, and proposed or accepted offers never create income.

[Niche-first behavior and verification](docs/development/PHASE_4_NICHE_FIRST.md)
describes contextual scoping, the small additive offer-context migration, and
current/past exploration semantics.

[Phase 4 implementation and verification](docs/decisions/PHASE_4.md) contains the
primary walkthrough, history decisions, screenshots and known verification limits.
[Current development state](docs/development/CURRENT_STATE.md) summarizes what is
implemented across domains. Run the local database suites with
`RUN_BUSINESS_INTEGRATION=1 RUN_FINANCE_INTEGRATION=1 pnpm test`.

## Seasons and Direction (Phase 5)

Open `/direction` for the current season, independent goals, experiments, and the
chapter library. Opening is optional and resumable. Source-qualified progress is
computed by the backend; goals retain their horizons across season boundaries.
Manual character images and quotes use private filesystem storage.

Development media lives in gitignored `.data/become/media/seasons/`. For a future
production installation, configure `BECOME_DATA_DIR=/srv/data/become` (an absolute,
persistent path outside the deployment) and give the application account ownership.
Back up that root together with PostgreSQL. Images are never stored in PostgreSQL
or served from a public uploads directory. No VPS access is needed for local work.

[Phase 5 architecture and invariants](docs/decisions/PHASE_5.md) documents measurement
qualification, lifecycle history, media limits and the Phase 5.5 boundary. Run local
Phase 5 database tests with `RUN_DIRECTION_INTEGRATION=1 pnpm test`.

Phase 5.5 adds explicit Anime, TV, Movie, Game, Book, Comic and Public figure
identity categories, onboarding image/text curation, recoverable imports, local
previews, cross-season image reuse, and later collection preferences. An eligible ordinary Home entry starts a prior participating Season's finale before the current opening. First-time users enter the current opening directly.
`Not now` persists deferral; Direction retains the resume path.

Read [Phase 5.5 setup, contracts and limitations](docs/decisions/PHASE_5_5.md)
before enabling providers. Copy only the desired settings from `.env.example`;
the default paid budget is zero. After additive migrations and `prisma generate`,
restart the local dev server to load the new generated client. Run the disposable
local COTS database suite with `RUN_COTS_INTEGRATION=1 pnpm test`.
