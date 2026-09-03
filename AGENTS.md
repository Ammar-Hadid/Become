<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Permanent repository organization

Become is a modular monolith organized primarily by product domain or feature.

- Put product-specific code under `src/features/<feature>/`. Colocate that feature's components, services, queries, schemas, hooks, utilities, mappers, and types.
- Create a feature subfolder such as `components/`, `services/`, or `queries/` only when the feature contains enough code of that role to justify it. Do not create speculative folders for unimplemented features or future phases.
- Keep truly shared UI primitives in `src/components/ui/` and truly shared application layout components in `src/components/layout/`. These directories are not general component dumping grounds.
- Keep only genuinely cross-cutting infrastructure and primitives under `src/lib/`, such as authentication, database access, dates, money, environment configuration, and generic validation infrastructure.
- Keep domain-owned types close to their feature. Do not create or use a global `src/types/` dumping ground. Prefer deriving types from Prisma, Zod, and existing TypeScript definitions where practical.
- Keep Next.js route files under `src/app/`. Route files should focus on routing, transport concerns, authorization boundaries, and composition; delegate substantial feature behavior to the owning feature module.
- Keep generated code under `src/generated/`, Prisma schema/migrations/seeding under `prisma/`, and end-to-end tests under `e2e/`. Never edit generated code manually.

## Permanent file-role naming

Every application-owned TypeScript or TSX file that is not constrained by a framework or tool must use an explicit architectural-role suffix:

- React component: `*.component.tsx`
- Business/domain service: `*.service.ts`
- Database/read query: `*.query.ts`
- Server Action: `*.action.ts`
- Application/domain middleware: `*.middleware.ts`
- Zod/validation schema: `*.schema.ts`
- Utility: `*.util.ts`
- React hook: `*.hook.ts`
- Types: `*.types.ts`
- Constants: `*.constants.ts`
- Configuration: `*.config.ts`
- Mapper: `*.mapper.ts`
- Adapter: `*.adapter.ts`
- Repository abstraction, only when genuinely justified: `*.repository.ts`
- Unit/integration test: `*.test.ts` or `*.test.tsx`
- End-to-end test: `*.spec.ts`

The suffix states what role a file performs; its folder path states which part of Become owns it. Avoid redundant names and needless abstraction layers.

Framework- and tool-reserved filenames take precedence. Keep required names such as `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, framework-required `middleware.ts`, `schema.prisma`, `next.config.*`, `eslint.config.*`, `playwright.config.*`, `vitest.config.*`, `components.json`, `package.json`, and `tsconfig.json`.
