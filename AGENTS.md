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

## Project documentation and development scope

The repository is authoritative for what currently exists.

- `README.md` is the human-facing project overview and local development guide.
- `docs/product/MASTER_SPEC.md` is the authoritative long-term product specification, including product direction, future requirements, and development phases.

Do not assume that functionality described in `docs/product/MASTER_SPEC.md` has already been implemented. Inspect the repository to determine the current implementation state.

For small, isolated tasks, read only the documentation and code relevant to the task.

Before beginning a new development phase:

1. Read this `AGENTS.md`.
2. Read `docs/product/MASTER_SPEC.md`.
3. Inspect the current repository and Git state.
4. Understand the existing implementation relevant to the new phase.
5. Plan the phase before modifying code.

Build Become incrementally:

`Build → Use → Understand → Adjust → Expand`

Do not implement functionality belonging to later phases unless explicitly requested.

Do not introduce speculative infrastructure

## Styling and design system

Become uses Tailwind CSS as the default styling approach, backed by a small, explicit global design system.

### Design tokens

Define recurring product-wide design decisions as Tailwind theme tokens.

Examples include:

- colors
- typography
- spacing
- border radii
- layout dimensions
- motion values

Prefer existing theme tokens over arbitrary values.

Before introducing a new color, spacing value, font size, radius, width, or other recurring visual constant, check whether an existing token already represents that design decision.

Use arbitrary values when the value is genuinely component-specific or one-off. Do not create a design token for every literal value.

If a visual value becomes repeated or represents a product-wide design decision, promote it into the theme rather than duplicating literals.

### CSS ownership

Do not use `globals.css` as the default destination for application styling.

Keep global CSS intentionally small and limited primarily to:

- Tailwind imports and global stylesheet composition
- design-system tokens
- document-level base styles and resets
- truly application-wide utilities or behavior

Prefer Tailwind utilities directly in components for ordinary component styling.

When custom CSS is clearer or necessary, such as for complex selectors, pseudo-elements, animations, or substantial bespoke styling, colocate that CSS with the feature or component that owns it.

Feature-specific styles belong with their feature under `src/features/<feature>/`.

Shared layout styles belong with the corresponding layout components under `src/components/layout/`.

Do not place feature-specific selectors in the global stylesheet merely because they are used on a page.

### Styling structure

Keep the global styling system small and understandable. A structure such as the following is preferred when those files are needed:

```text
src/app/
├── globals.css
└── styles/
    ├── tokens.css
    ├── base.css
    └── utilities.css
```

Do not create speculative stylesheet files or split styles into excessively granular files without a real organizational benefit.

The goal is clear ownership:

- global design decision → global design system
- shared application primitive → shared owner
- feature-specific styling → feature owner
- simple component styling → Tailwind utilities