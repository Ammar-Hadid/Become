<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Permanent repository organization

Become is a modular monolith organized primarily by product domain or feature.

- Put product-specific code under `src/features/<feature>/`.
- Keep feature roots primarily structural. Do not allow implementation files to accumulate directly in a feature root as a flat collection.
- Apply this organization recursively to nested concerns, not only feature roots. A concern such as `technologies/`, `projects/`, or `timer/` should contain role folders such as `components/`, `constants/`, `services/`, `hooks/`, and `utils/` for the code it actually owns.
- Role folders are implementation leaves; do not repeat the same role in additional nested folders. Keep related tests beside their source. Shared UI may group components by purpose, with a component's own stylesheet beside it.
- Within each feature, group authored files into meaningful concern or responsibility folders such as:
  - `components/`
  - `services/`
  - `queries/`
  - `analytics/`
  - `projects/`
  - `technologies/`
  - `evidence/`
  - `hooks/`
  - `schemas/`
  - `types/`
  - `constants/`
  - `styles/`
  - `mappers/`
  - `adapters/`
- These folder names are examples, not a mandatory universal folder list. Prefer grouping by the actual responsibilities and concepts present in the feature.
- A folder containing only one file is acceptable. Do not leave an implementation file in a feature root merely to avoid creating a single-file folder.
- Do not create speculative folders for functionality, concepts, or future phases that do not exist yet.
- Prefer the following hierarchy:

  `feature/domain → concern or responsibility → role folder → file with architectural-role suffix`

  For example:

        src/features/engineering/
        ├── analytics/
        │   ├── queries/
        │   │   └── engineering-analytics.query.ts
        │   └── utils/
        │       ├── engineering-analytics.util.ts
        │       └── engineering-analytics.util.test.ts
        ├── projects/
        │   ├── actions/
        │   │   └── engineering-project.action.ts
        │   └── services/
        │       └── engineering-project.service.ts
        └── technologies/
            ├── constants/
            │   └── engineering-technology.constants.ts
            └── utils/
                ├── engineering-technology.util.ts
                └── engineering-technology.util.test.ts

- Do not replace domain-first organization with global technical folders such as `src/services/`, `src/hooks/`, `src/queries/`, or `src/types/`.
- Keep truly shared UI primitives in `src/components/ui/` and truly shared application layout components in `src/components/layout/`. These directories are not general component dumping grounds.
- Keep only genuinely cross-cutting infrastructure and primitives under `src/lib/`, such as authentication, database access, dates, money, environment configuration, and generic validation infrastructure.
- Keep domain-owned types close to their feature. Do not create or use a global `src/types/` dumping ground. Prefer deriving types from Prisma, Zod, and existing TypeScript definitions where practical.
- Keep Next.js route files under `src/app/`. Route files should focus on routing, transport concerns, authorization boundaries, and composition; delegate substantial feature behavior to the owning feature module.
- Keep generated code under `src/generated/`, Prisma schema/migrations/seeding under `prisma/`, and end-to-end tests under `e2e/`. Never edit generated code manually.
- Do not reorganize generated code, Prisma-generated output, Prisma migration structure, framework-managed files, tool-managed artifacts, or other generated output merely to satisfy authored-source folder conventions.
- Framework- and tool-managed structure should remain in the layout expected by the owning framework or tool.

The purpose of this organization is predictable navigation and clear ownership, not maximum nesting. Avoid unnecessary folder depth when it does not improve understanding.

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

The folder path states which part of Become owns the file and which concern it belongs to. The suffix states what architectural role the file performs.

Avoid redundant names and needless abstraction layers.

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

Do not introduce speculative infrastructure.

## Styling and design system

Become uses Tailwind CSS as the default styling approach, backed by a small, explicit global design system.

### Shared submenu component

Whenever an interface needs a submenu or action menu, use the shared menu components in `src/components/ui/menus/`. Do not create feature-specific submenu markup, interaction state, keyboard handling, positioning logic, or duplicate menu styling. Extend the shared menu components when a legitimate new submenu requirement is not yet supported.

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

    src/app/
    ├── globals.css
    └── styles/
        ├── tokens.css
        ├── base.css
        └── utilities.css

Do not create speculative stylesheet files or split styles into excessively granular files without a real organizational benefit.

The goal is clear ownership:

- global design decision → global design system
- shared application primitive → shared owner
- feature-specific styling → feature owner
- simple component styling → Tailwind utilities

### Motion system

Before adding or changing product motion, read `docs/design/MOTION_SYSTEM.md`.

- Reuse the shared motion tokens and established interaction recipes.
- Keep animation local to the state change it explains and preserve stable layout anchors.
- Treat motion as progressive enhancement; behavior, focus, and announcements must remain correct with reduced motion.
- Do not add a motion dependency or invent a feature-specific timing/easing system without documenting a capability the existing CSS, platform, and React View Transition foundation cannot provide.
- Do not add feature-specific motion to unfinished placeholder domain interfaces. Shared shell motion may still apply.
