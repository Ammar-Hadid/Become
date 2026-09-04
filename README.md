# Become

Become is a calm personal operating system for connecting intention, focused time, outcomes, and direction. This repository currently contains **Phase 1: Foundation** and **Phase 2: Engineering**.

## What Phase 1 includes

- Email/password authentication with Better Auth
- Personal, configurable domains and activity types seeded on signup
- A single global timer with refresh recovery
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

Later-phase finance, CRM, goals, experiments, reviews, AI, Gmail, and YouTube pipeline features are intentionally not implemented.

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
pnpm db:sync-reference
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
pnpm test:e2e       # Playwright critical journey (database must be running)
pnpm db:migrate     # apply/create Prisma migrations
pnpm db:seed        # sync reference data, then ensure demo domains if the user exists
pnpm db:sync-reference # synchronize built-in reference data only
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
3. Add useful aliases only if needed, then run `pnpm db:sync-reference`.
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
`pnpm db:sync-reference`, then deploy/start the application. The maintenance
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
- Seasons are derived fixed quarters, never stored as redundant records.
- A partial unique PostgreSQL index guarantees only one active product session per user.
- A product `Session` is distinct from Better Auth's `AuthSession`.
- An activity must belong to the selected domain and that domain must belong to the authenticated user.
- Every new Engineering session stores its own context independently of its optional project; that session value is authoritative history.
- Selecting a project may prefill its context when starting a timer, but the Session context remains editable and is stored independently.
- Technologies are reusable project metadata only; they are never required or stored on timer sessions.
- Engineering projects and evidence are user-owned, and cross-user or cross-domain relationships are rejected at the database and service boundaries.
- Durations are clipped to analytics boundaries, including sessions crossing midnight, weeks, months, seasons, or DST changes.
- The database is truth. The current Phase 1 “recent signal” is deterministic copy, not an AI claim.

## Known boundaries

- Dashboard layout is intentionally fixed; persisted drag/reorder/resize begins only when customization is prioritized.
- Completed sessions cannot be edited or deleted yet; Engineering context and project can be corrected before stopping an active session.
- Engineering projects can be edited and archived, and evidence can be edited; permanent deletion is intentionally not exposed.
- Project forms use browser confirmation rather than drafts or autosave when modified data would be discarded.
- No password reset or email verification delivery is configured for local personal use.
- There is no rate-limit adapter yet; deployment should add an infrastructure-appropriate limiter to auth and mutations.
- Analytics show the current period and its previous equivalent; arbitrary historical period navigation is a later enhancement.

The next logical phase is **Phase 3: Finance**—manual accounts and transactions, transfer handling, paid-work linkage, income opportunities, and deterministic financial analytics.
