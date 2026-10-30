# Entrepreneurship redesign

## What changed and why

Entrepreneurship now starts with the current question and a clear next action. The domain keeps its full research and commercial record, while presenting the work in smaller, recognizable places.

The launcher gives the current exploration a prominent elevated-glass card. A separate quieter panel starts another exploration; recorded activity appears as four compact metrics. Other active explorations and searchable past work remain available. No count implies confidence or success. Domain and exploration error screens use a shared recovery panel with a retry action, keeping the installed Next.js `retry` contract.

Inside an exploration, the overview leads with the existing deterministic recommendation, explains why it is suggested, and offers a direct action. A separate understanding panel summarizes the recorded problems, segments and conversations. Five compact destination cards lead to Audience, Outreach, Conversations, Evidence and Offers. Latest evidence and chosen follow-ups occupy their own panels. The seven direct workspaces remain available in a horizontal navigation bar; no earlier step must be completed to use a later capability. **Manage exploration** groups the scope, direction decision, edit and archive controls in a compact disclosure. These controls remain reachable on phones, where the previous responsive rules hid them.

Collections and detail records now reuse actual shared glass `Card` surfaces. Feature CSS no longer redraws their fills, gradients, borders or panel padding. Quiet divided rows preserve scannability; inspectors retain the selected record and return context. Collection filters, archives, search and pagination remain available. Page titles use direct names instead of metaphoric framing, with shorter explanatory copy.

Business fields now use shared `Input`, `Textarea` and `NativeSelect`. Existing labels, names, required states, values, server actions, validation and dirty-form guards remain intact. All ordinary dialog triggers opt into the revised workspace button system; menu actions retain their shared menu role. Optional conversation setup is grouped under **Guide, linked reply & context**. Its controls remain mounted when collapsed, so existing selected replies and form data are preserved. Offer sections ask what is being offered and how it should be priced. Evidence still begins by choosing a conversation, direct observation or public source.

Conversation lists, transcript reading, contextual details, conduct workspace, guide preview and snapshot history have distinct reading surfaces. The rich guide editor, document autosave, conflicts, publishing, pinned revisions and free-form writing remain intact. The global dashboard timer's shared business fields were deliberately preserved.

Existing Nexo synthesis retains manual generation, review, editing, rejection and explicit acceptance. Accepted summary prose uses shared Living Ink, with static reading on later visits and reduced-motion behavior. There is no new AI workflow, automatic generation, provider call or additional recurring AI cost introduced by this redesign.

Browser validation also exposed a pre-existing PostgreSQL error in the exploration and all-work summaries: a composed focus-duration SQL expression could reach the runtime as an unknown bound parameter. Both queries now pass an explicit `Prisma.sql` composition. Focus duration, pause subtraction and user/exploration scoping retain their original meaning; a local database regression covers the empty state, paused time, a second exploration and another user.

## New user journeys

### Explore an idea

1. Open Entrepreneurship and choose **Start exploration**.
2. Name the question and optionally describe it or choose an initial audience.
3. Continue to the exploration overview.
4. Follow the suggested next action or open any workspace directly.
5. Return to the current exploration from the launcher; paused, stopped and archived work remains searchable in past explorations.

### Learn from people

1. Add or attach relevant segments, people or businesses in Audience.
2. Record outreach, a reply or a failed contact attempt in Outreach.
3. Keep a follow-up when there is a real next action.
4. Start a conversation with a participant and channel; expand optional setup for a guide, prior reply or opening context.
5. Capture the conversation freely or use the pinned guide. Pause, resume, finish, correct and debrief through the existing controls.
6. Promote useful excerpts into evidence with their original source relationship.

### Turn evidence into understanding

1. Choose **Keep evidence** and the kind of source.
2. Record what happened or what was observed; attach identity and audience context when useful.
3. Search the evidence journal or inspect a source or observation.
4. Add findings or questions in So Far We Know, or request the existing Nexo proposal when configured.
5. Review classifications and source citations; edit, discard or accept deliberately.
6. Publish or inspect historical editions without changing prior accepted evidence.

### Test an offer

1. Open Offers and choose **Shape an offer**.
2. Choose an audience test or a specific recipient, then state the offer and scope.
3. Set the pricing basis; leave unknown amounts blank rather than substituting zero.
4. Record sharing, recipient responses or a specific proposal outcome.
5. Inspect term revisions and actual Finance receipts separately. An accepted offer still does not create income.
6. Continue a work relationship through the existing Finance handoff when explicitly chosen.

### Review all work

Open **Across every exploration** from the launcher. Global overview, audience, evidence, problems and offers keep their existing links and return paths. Global Audience remains active while inspecting people, segments or businesses; Evidence remains active for interactions and observations.

## Route coverage

| Route family                                                                    | Redesigned experience                                                            | Preserved behavior                                                                    |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `/entrepreneurship`                                                             | Current-focus hero, recorded metrics, secondary exploration, active/past records | Current/past selection, archive filter and search                                     |
| `/entrepreneurship/history`                                                     | Shared summary and evidence panels                                               | Period calculations, audience metrics, actual receipts, follow-ups                    |
| `/entrepreneurship/audience`, `/people/[id]`, `/segments/[id]`                  | Searchable divided collections and record cards                                  | Membership, editing, archive, evidence relationships                                  |
| `/entrepreneurship/market`, `/market/[kind]/[id]`                               | Business collection/inspector and contextual details                             | Business/niche records, work-source links, receipts                                   |
| `/entrepreneurship/interactions`, `/interactions/capture`, `/interactions/[id]` | Focused capture and grouped event details                                        | Revision correction, participants, explicit reply links, follow-ups                   |
| `/entrepreneurship/evidence`, `/evidence/sources/[id]`, `/observations/[id]`    | Evidence ledger, source and observation panels                                   | Source kinds, attribution, revision provenance, withdrawal/corrections                |
| `/entrepreneurship/problems`, `/problems/[id]`                                  | Direct problem list and source/judgment cards                                    | Supporting and challenging evidence, scoped assessments and history                   |
| `/entrepreneurship/offers`, `/offers/[id]`                                      | Scannable offers, inspector, terms and response cards                            | Specific/audience modes, revisions, outcomes, currency semantics and receipts         |
| `/entrepreneurship/explorations/[id]/overview`                                  | Recommendation, understanding and destination cards                              | Existing deterministic recommendation and scoped queries                              |
| `…/so-far-we-know`, `/review`, `/history`, `/problems`, `/problems/[id]`        | Shared synthesis and audience-lane reading cards                                 | User judgments, manual authoring, Nexo review, immutable editions and source trails   |
| `…/audience`, `/people/[id]`, `/segments/[id]`, `/businesses/[id]`              | Scoped collection and detail treatment                                           | Scoped search, archives, selected record and return URL                               |
| `…/outreach`, `/activity/[id]`, `/[id]`                                         | Activity/follow-up queue and inspector                                           | Reply chains, batch capture, follow-up completion/rescheduling                        |
| `…/conversations`, `/[id]`, `/[id]/conduct`                                     | Conversation index, transcript and conduct surfaces                              | Message history, bookmarking, correction, observation promotion, pause/resume/debrief |
| `…/conversations/guides`, `/[id]/edit`, `/[id]/preview`                         | Guide collection, shared controls and preview surface                            | Whole-document autosave, conflicts, publishing, pinned revisions, archives            |
| `…/evidence`, `/sources/[id]`, `/observations/[id]`                             | Scoped evidence/source/observation panels                                        | Search/filter context, source provenance and correction history                       |
| `…/offers`, `/[id]`                                                             | Scoped list, inspector and details                                               | Offer terms, audience responses and explicit Finance handoff                          |
| Legacy exploration aliases                                                      | Existing redirects retained                                                      | Query parameters and canonical scoped destinations                                    |

## Shared design and feedback

- Workspace composition is opt-in at the Entrepreneurship layout; protected dashboard and Season onboarding defaults are unchanged.
- Glass, elevated glass and dense cards serve different content roles. Nested records remain divided rows instead of separate gradient cards.
- Page gutters follow the shared desktop/mobile tokens; the domain does not add a narrower maximum page width.
- Buttons and links use the shared workspace action treatment. Native selects reserve chevron space; fields preserve the shared underline treatment.
- Evidence-kind selection and snapshot audience-tab selection use Pulse Pin only when the selection changes. Accepting a Nexo edition uses the confirmed-save cue. Shared forms provide confirmed save/error feedback through the central system. Nothing plays during typing, scrolling or passive reading.
- Existing motion tokens govern content and inspector transitions. Added destination-card movement is disabled for reduced motion. Sound remains user-mutable through shared settings.

## Validation

- Entrepreneurship deterministic suite: **18 tests passed across 5 files**; **47 opt-in database tests skipped across 5 files** in the default run.
- Local PostgreSQL focus aggregation regression: **1 passed** (27 unrelated integration cases skipped), including pause subtraction and exploration/user boundaries.
- Domain ESLint: passed.
- Whole-app TypeScript: passed after shared integration. The lead also confirmed an optimized production build with the final recovery screens.
- Changed files formatted with repository Prettier configuration.
- Domain Chromium validation: **all 10 scenarios passed** across the full run (9 passes) and the remaining isolated production run (1 pass in 7.1 seconds). This includes 35 empty-workspace and 20 populated viewport checks at 320, 390, 768, 1024 and 1440 px. The creation-navigation scenario passed against the optimized build after a development refresh had returned it to the list. Final whole-app outcomes belong in `CHANGELOG_AND_JOURNEYS.md`.
- Browser checks cover large collections, archived histories, record inspectors and return URLs, capture, guide autosave, source correction, Nexo acceptance with immutable prior editions, failed save recovery, dirty-form dismissal, reduced motion, and timer completion. Disposable users and generated fixtures keep verification separate from personal records.
- Test setup uses the existing authenticated opening-defer command. Legacy redirects are checked after navigation commits, preserving their canonical route and query assertions. Timer checks use the approved header’s current **End focus session** action.

## Visual verification

Saved screenshots use disposable browser fixtures and cover the overview, a populated collection and a conversation with long source text.

| Surface             | Desktop                                                       | Phone                                                       |
| ------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Overview            | [1440 px](screenshots/entrepreneurship-overview-1440.png)     | [390 px](screenshots/entrepreneurship-overview-390.png)     |
| Populated outreach  | [1440 px](screenshots/entrepreneurship-outreach-1440.png)     | [390 px](screenshots/entrepreneurship-outreach-390.png)     |
| Conversation detail | [1440 px](screenshots/entrepreneurship-conversation-1440.png) | [390 px](screenshots/entrepreneurship-conversation-390.png) |

## Boundaries

No schema, service, calculation, authentication, archive, history or AI generation behavior was removed or replaced. The simple-goal contract remains unchanged: this domain introduces no subgoals or hierarchy. The retained `* 2` historical source copies were not treated as live implementation or deleted as part of this work.
