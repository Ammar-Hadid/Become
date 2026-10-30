# Phase 4 — niche-first Entrepreneurship

Historical implementation and verification record. Its visual, layout, navigation, copy and interaction choices are not requirements or a baseline for the frontend redesign. Domain semantics and objective technical constraints remain applicable.


Implemented 8–9 September 2026 on the existing working tree. This corrects Phase 4's product hierarchy; it does not begin Phase 5. Existing acceptance corrections are retained. No commit, push or deployment was made.

## Information architecture

- `/entrepreneurship` is the exploration entry: one current exploration, an explicit **Start exploration** action, and past explorations in a simple list.
- `/entrepreneurship/explorations/{nicheId}` is the named workspace. **Overview · Companies · Interactions · Problems · Offers** stay in this context, including record details, pagination, archive controls, company search and post-save navigation.
- **Global history** opens `/entrepreneurship/history`. The existing Market, interaction journal, problem library and offer history remain available as secondary global routes. Canonical company search and independent archive controls remain intact.
- Old niche-detail links redirect to the matching workspace. Existing global record links remain valid.

## Lifecycle and current selection

`Niche` and `NicheDecision` remain the lifecycle model. Creation records an initial EXPLORING decision and scope snapshot. The workspace exposes pause, stop, pursue and resume with a recorded reason. Writes serialize and the new lifecycle form rejects stale decisions rather than overwriting an intervening change.

The most recently started or direction-changed non-archived EXPLORING/PURSUING niche is current. Editing its name or scope does not change its position. If more than one niche is still active, the others appear under **Also active**; starting another exploration does not silently pause them. PAUSED, STOPPED and archived niches appear under **Past explorations**, with their actual decision/archive date. Opening them retains their records and decisions. Resuming continues their existing history.

No history is deleted or reset. A newly created Barbers niche has zero companies, interactions, problems, offers and session time, even after a populated Dentists exploration.

## Relational truth and scoping

The existing Company–Niche relationship remains many-to-many. Companies also remain discoverable through recorded historical participation. **Add existing company** explicitly adds a membership without replacing other memberships or importing earlier events.

Interactions use the current factual revision's explicit niche snapshot. Problems participate through their own niche or explicitly linked evidence from that context; scoped list evidence counts use context-relevant sources and retain distinct-company counting. Shared problem details preserve the broader source histories, with a clear cross-context explanation. Sessions use their recorded niche snapshot. No session, contact or observation is fabricated by membership, timer activity or a lifecycle decision.

The only new schema structure is `OfferNiche`: a many-to-many participation link with the niche label and capture date. An offer created within a workspace captures this link atomically with its first quoted revision. Later revisions never silently move the offer. Existing offers can also be found through their explicitly linked niche-specific problems; company membership alone is never used to scope offers.

This small additive migration is necessary because the previous Offer architecture had no independent niche context. Filtering offers through a shared company's memberships would have pulled Dentists offers into Barbers. There is no backfill, ownership conversion, new Exploration model, data reset or modification of prior migrations. Composite foreign keys preserve same-user ownership checks.

Unchanged foundations include interaction/observation revision histories, evidence/assessment bases, quoted offer revisions and accepted-term selection, WorkSource relationships, Finance receipt allocation/locking, session attribution, retry-safe capture, structured participants and multiple observations.

## Contextual creation and timers

- Company creation checks the selected niche by default. Existing-company reuse requires explicit selection and an **Add to exploration** save.
- New interactions and problems prefill the workspace niche. Interaction context remains editable, with visible guidance for events that happened elsewhere. Batch outreach saves the selected workspace context alongside each confirmed sent event and preserves recipient overrides and retry behavior.
- Offers capture the independent workspace participation link. Direct/public observations inherit context; observations based on an existing interaction retain that source's actual niche. Corrections, replies and post-session capture retain their original factual defaults, including an intentionally empty niche.
- **Start session** and the shared timer trigger prefill Entrepreneurship and the workspace niche. Opening an already running timer shows that session; switching workspaces never changes its completion context. Optional post-completion interaction capture remains optional.
- The workspace overview describes all recorded activity in that exploration: companies, contacted companies, interactions, conversations, problems, offers, source words, chosen interaction/offer follow-ups and recorded session time. Global period/Finance analytics remain in Global history.
- Work relationships and receipts on shared company details are explicitly identified as company-wide records across explorations.

## Repeated exploration of the same market

For now, one canonical niche has one continuing history. Pausing and resuming Dentists does not create a separate September/March episode or reset its counters. Decision history retains the scope at each decision. The UI states that resuming continues the existing exploration.

A future distinct episode can add a dated focus/episode association under the same canonical niche, with explicit fact participation and migration rules. The routes are identity-based, company membership stays many-to-many, and sources retain snapshots, so this remains an additive evolution. Existing facts must not be retrospectively assigned to a guessed episode. No episode model or Phase 8 analysis is implemented now.

## Verification

- Unit and local PostgreSQL integration suite: **129 passed, 3 skipped**. The skipped tests are the pre-existing opt-in Engineering reference-catalog checks.
- New integration scenarios cover initial/paused/stopped/resumed decisions, stale decisions, fresh workspace counts, shared companies, preserved offer context across revisions, global history, batch niche snapshots and atomic rejection of invalid ownership.
- Browser verification uses disposable local accounts and includes the full Dentists → stop → Barbers journey, all four contextual creation paths, shared-company reuse, original timer completion after switching niches, global offer access, reduced-motion dismissal/focus restoration and no horizontal page overflow.
- The manual browser journey independently created Dentists, a company, an interaction with an observation, a problem, an offer and a session; paused Dentists; created Barbers; verified all initial counts and time were zero; completed the original Dentists timer from Barbers; and shared the company without bringing its old interactions/offers into Barbers.
- Desktop, tablet and mobile screenshots were inspected. Shared dialogs, menus and accessible layer lifecycle were verified. No motion dependency or new timing system was added.
- The period/scroll regression now targets the relocated global analytics route. The five-row company viewport test waits for visible layout before taking its initial measurement, retaining the original height assertions.

- Final complete browser run: **69 passed**, covering `explorations`, `entrepreneurship`, `phase4-corrections`, `timer-recovery`, and `finance` on all three profiles.
- TypeScript, repository-wide ESLint, production `next build --webpack`, and `git diff --check`: **passed**.
- Disposable browser fixtures were cleaned up; the exact manual inspection account was verified absent after cleanup.
- The single additive migration was applied to the verified local `localhost/become` database. Generated Prisma code came from `prisma generate`.
- Overview/list company, problem and offer counters follow active-record defaults; archived records remain available through each list's archive control. Interaction/session history uses its explicit recorded context.

Physical devices, the unrelated known Engineering browser-history timing issue, large-scale load, and a formal accessibility audit are outside this verification. This is not a claim that the entire repository's unrelated browser suite was rerun.

## Screenshots

The images use disposable test data, not the user's records.

| View | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| No explorations | [Desktop](niche-first-qa/chromium-empty.png) | [Tablet](niche-first-qa/tablet-empty.png) | [Mobile](niche-first-qa/mobile-empty.png) |
| Populated Dentists | [Desktop](niche-first-qa/chromium-dentists.png) | [Tablet](niche-first-qa/tablet-dentists.png) | [Mobile](niche-first-qa/mobile-dentists.png) |
| Fresh Barbers | [Desktop](niche-first-qa/chromium-barbers.png) | [Tablet](niche-first-qa/tablet-barbers.png) | [Mobile](niche-first-qa/mobile-barbers.png) |
