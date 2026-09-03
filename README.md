# Become

Become is a calm personal operating system for connecting intention, focused time, outcomes, and direction. This repository contains **Phase 1: Foundation** only.

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

Later-phase finance, CRM, goals, experiments, reviews, AI, Gmail, and YouTube pipeline features are intentionally not implemented.

## Stack

Next.js App Router, React, TypeScript, PostgreSQL, Prisma, Better Auth, Tailwind CSS, shadcn-style local primitives, Zod, Recharts, Luxon, Vitest, and Playwright. `dnd-kit`, React Hook Form, and the official OpenAI SDK are installed for their specified future uses but are not forced into Phase 1 flows that do not need them.

## Run locally

Requirements: Node.js 24+, pnpm, and Docker (or a PostgreSQL 17-compatible database).

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
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
pnpm db:seed        # ensure domains for demo@become.local, if it exists
pnpm db:studio      # inspect local data
```

Install Playwright's Chromium browser once if it is not already present:

```bash
pnpm exec playwright install chromium
```

## Architecture

- `src/app` contains thin Next.js route and composition files.
- `src/features/dashboard` owns command-center UI, types, and deterministic aggregation queries.
- `src/features/sessions` owns timer/session components, queries, schemas, mappers, services, and types.
- `src/features/domains` owns initial domain configuration, domain queries, and seeding behavior.
- `src/features/auth` owns the authentication UI.
- `src/components/layout` and `src/components/ui` contain genuinely shared application shell and UI primitives.
- `src/lib/auth`, `src/lib/db`, `src/lib/dates`, and `src/lib/config` contain cross-cutting infrastructure and primitives.
- `prisma/schema.prisma` defines the relational source of truth.

## Core business rules

- PostgreSQL timestamps are canonical UTC instants; calendar interpretation uses `APP_TIMEZONE`.
- Seasons are derived fixed quarters, never stored as redundant records.
- A partial unique PostgreSQL index guarantees only one active product session per user.
- A product `Session` is distinct from Better Auth's `AuthSession`.
- An activity must belong to the selected domain and that domain must belong to the authenticated user.
- Durations are clipped to analytics boundaries, including sessions crossing midnight, weeks, months, seasons, or DST changes.
- The database is truth. The current Phase 1 “recent signal” is deterministic copy, not an AI claim.

## Known Phase 1 boundaries

- Dashboard layout is intentionally fixed; persisted drag/reorder/resize begins only when customization is prioritized.
- Sessions can be started and completed but not edited or deleted yet.
- No password reset or email verification delivery is configured for local personal use.
- There is no rate-limit adapter yet; deployment should add an infrastructure-appropriate limiter to auth and mutations.
- Analytics show the current period and its previous equivalent; arbitrary historical period navigation is a later enhancement.

The next logical phase is **Phase 2: Engineering**—projects, project-linked sessions, outputs and learning evidence, and engineering-specific analytics.
