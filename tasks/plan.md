# Become complete experience redesign — 27 October 2026

## Owner brief and acceptance contract

Make the application intuitive without removing capability. Follow the approved dashboard and Season onboarding, the owner's two Finance sketches, and the shared systems. Recompose all real product pages except the dashboard and approved Season opening/onboarding. Preserve their code and presentation. Historical design/candidate routes remain reference fixtures, not product scope. The owner authorizes new shared treatments, motion and sound without a separate preview approval for this redesign. The subsequent instruction includes redesigning the current buttons. New AI use requires explicit owner approval with frequency and monthly sole-user cost; none is needed for the first implementation.

## Recovery and working branch

Original checkout: `/Users/elpridro/Documents/localDev/AI/Become`, branch `factor`, remains untouched. Its entire tracked/nonignored working state is captured by `codex/redesign-baseline-20261027` (`66e55357132b15053744658becb0aa596448632d`). Redesign checkout: `/Users/elpridro/Documents/localDev/AI/Become-redesign`, branch `codex/whole-app-redesign`. Managed checkout creation hit local Git memory-map errors; a no-checkout worktree plus exact file copy preserves the source after exact-content Git object hydration was repaired and verified. No credentials/database/media are committed or migrated.

## Design decisions

- One page purpose, one useful primary action, compact local navigation.
- Distinct roles: focal outcome card, quiet statistic, glass work panel, divided record list, focused form. No generic gradient repeated everywhere.
- Group facts spatially. Details and optional controls stay reachable through labeled disclosure; required controls never hidden unexpectedly.
- Real data only. No invented financial cards, metrics, progress or model response.
- Preserve all correction/history/archive/pagination, auth and financial semantics.
- Shared Input/Textarea/Select/Button/material/motion/sound own their visual treatment. New workspace composition is opt-in so protected screens do not change.
- Keyboard, touch, accessible labels, 320–1440+ widths and reduced motion are completion criteria.

## Phases and ownership

### 1. Foundation — lead agent

Create shared workspace header/navigation/panel/metric/action/disclosure and native select; scoped button refresh; restrained confirmed-save/error sounds; document shared API. No changes to protected component defaults. Verify types and basic rendering before domain integration.

### 2. Finance — finance agent (after shared API)

14 routes: overview; transactions/detail; accounts/detail; savings/detail; recurring; opportunities/detail; work detail; finance settings/categories/counterparties. Compose overview/ledger from supplied renders using real data. Preserve currency separation, reconciliation, transfers, reserve/allocation/spending distinction, attribution and opportunity handoff. Verify finance tests and browser journeys.

### 3. Entrepreneurship — entrepreneurship agent (after shared API)

All global and exploration views, details, guide editor, corrections, offers and existing Nexo review. Lead with next action; keep research/audience/outreach/conversation/evidence/offer functions accessible. Replace scattered framing with focused workspaces; simplify forms through questions and optional context. Verify domain and browser journeys.

### 4. Engineering, Content, activity — engineering_content agent (after shared API)

All Engineering routes; Content desk/detail/script chrome/forms; session history and generic domain pages. Clear overview, grouped records, basics-first forms and discoverable archive/pagination. Preserve technical context, rich editor/autosave, releases, results and timer semantics. Dashboard-shared UI must be scoped or left intact. Verify domain suites and browser journeys.

### 5. Direction, Reviews, Settings, remaining pages — lead agent

Goals/experiments/criteria/ideas/decisions, Season management/library/finale outside protected opening, review history/reading/reflection, application/personal/Nexo/image prompt settings, authentication and recovery pages. Group tasks and simplify language, preserve evidence/lifecycle and saved records. Verify tests and desktop/phone output.

Execution split for the second wave: the Finance agent completed all Settings; the Engineering/Content agent completed Reviews and finale; the lead completed Direction, simple goals, Season management, authentication and integration. Entrepreneurship and Finance then independently reviewed other agents' changes.

### 6. Integration, evidence, handoff — lead plus focused agent reviews

Check every product route in a route matrix. Typecheck/lint/build, deterministic tests, relevant isolated-fixture E2E; inspect representative populated, empty, form and detail pages at desktop and phone sizes. Check protected code hashes/diff. Fix regressions, save phase commits and produce `docs/redesign/CHANGELOG_AND_JOURNEYS.md` with rationale, capability coverage, journeys, validation and limitations.

## Checkpoints

1. Foundation and branch ready before agents edit.
2. Each domain reports pages, retained capabilities, tests and remaining issues before integration.
3. Whole-app validation plus protected-screen check before completion claim.

## Risks

Shared CSS leakage: scope new system and avoid edits to protected tokens/defaults. Legacy selectors/tests: update behavior assertions to new accessible labels without weakening invariants. Complex forms: retain native semantics, validation and dirty guards. Data: use disposable test users and never mutate personal records for screenshots. Local Git: preserve exact source and repair only newly-created checkout/index state.
