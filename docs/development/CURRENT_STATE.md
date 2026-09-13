# Current development state

Phases 1–7 are merged into the repository, including the completed Content/script-editor and thumbnail work, persistent session pause/resume, COTS curation, and the review/finale experience. Production preparation is documented in [the deployment walkthrough](../deployment/PRODUCTION.md). The repository is authoritative for what exists; the master specification also describes future work. See [Phase 7 verification](../decisions/PHASE_7.md) for acceptance details and migration isolation.

## Available now

- Foundation: local authentication, domains, recoverable timer, session history,
  session details, and calendar-aware analytics.
- Engineering: projects, context, reusable technologies, evidence, archive/restore,
  and time/evidence analytics. Project technologies describe current project
  metadata; Session context remains historical and is never inferred retroactively.
- Finance: accounts and observed balance reconciliation, actual transactions,
  categories/counterparties, recurring expenses and occurrence confirmation,
  savings goals and expense attribution, WorkSources, income opportunities,
  Paid Work session attribution and confirmed effective-rate analytics.
- Entrepreneurship: niche-first workspaces with current/past explorations and
  secondary global history, shared companies, explicit offer–niche participation,
  atomic interaction capture, manual batch outreach, explicit replies, sourced
  observations, Problem evidence and scoped assessments, recurring or one-off
  offer quotations and actual outcomes, chosen follow-ups, WorkSource continuation,
  Finance-owned receipt attribution, optional Session context, and an overview
  scoped to the chosen niche, market observations and the next chosen action.
  See [niche-first implementation](PHASE_4_NICHE_FIRST.md) for lifecycle semantics.
- Direction: fixed-quarter opening/identity/closing, canonical goals, seasonal roles,
  exact source-qualified criteria, dated manual judgments, independent experiments,
  meaningful history, private filesystem media, manual quotes and chapter library.
  See [Phase 5 decisions](../decisions/PHASE_5.md).
- COTS: explicit source category and identity context, external image/text
  discovery, durable selections and imports, private local previews, collection
  reuse/preferences, contextual seasonal presence, and proactive opening with
  persistent deferral. See [Phase 5.5 setup and limits](../decisions/PHASE_5_5.md).
- Content: one work/variants/releases/channels, owned thumbnails, dedicated rich script editing with autosave and conflict recovery, DOCX/TXT import/export, linked Sessions, explicit release corrections and dated manual lifetime observations.
- Ideas and Decisions: global captures, explicit promotion into canonical work, original reasoning, changes, supersession and later reflections.
- Reviews: all four periods, qualified cross-domain facts, historical intention coverage, source pagination, user-selected moments, optional writing, immutable final editions and explicit amendments. Multi-quarter reviews keep distinct Season chapters.
- Season transition: prior participating Season → progressively revealed finale → existing current opening, with quiet no-COTS/sparse paths, persistent deferral/progress, skip/replay, duplicate-tab coordination and active-work guards. Carry-forward words are reviewable suggestions.
- Phase 8 foundations: bounded period/current/targeted contracts and a versioned source-grounded persona-profile input. Phase 7 supplies no researched profile and performs no AI generation.
- Business attention is available on Home; Finance also surfaces receipt attribution
  that needs review. Legacy Entrepreneurship domain links redirect to the dedicated
  workspace and preserve query parameters.

## Truth and history

The timer applies the authoritative completion response immediately. Retrying a
completion returns the original result and does not duplicate side effects.
Entrepreneurship Session company, niche and activity categories are snapshots.
Old sessions remain unknown where context was never recorded. Completion offers
an optional separate interaction capture; time spent never creates contact facts.

Evidence points to an exact source version. Material corrections can require
review; editorial labels and unrelated notes do not. Historical assessments keep
the evidence considered at the time. Company memberships and WorkSource links are
current relationships, rather than a general temporal database.

Quoted prices, acceptance and actual received money are distinct. Monthly/yearly
quotes never generate income. Finance owns business receipt allocations and locks
the underlying transaction for allocation, relevant edit and deletion. Session and
business allocations are separate dimensions of one payment, never additive money.

## Intentional boundaries

- Completed Session timing is not generally editable or deletable.
- No Contact directory, email sending, campaigns, AI evidence judgments, invoicing,
  subscription billing, projected recurring revenue, acquisition ROI or business
  effective hourly rate. Credentialed COTS sources require setup; AI commentary, generated farewells/chat, recurring-commitment compliance, and later phases remain deferred.
- No guessed historical business categorization or automatic validation labels.
- Global reference catalog synchronization remains an explicit developer operation.
- Balance reconciliation is an observed anchor; missing anchors mean unknown.
  Recurring-expense posting is the user's scheduled assumption, not bank verification.

## Verification and implementation notes

See [Phase 4 delivery and verification](../decisions/PHASE_4.md) for exact passed,
skipped and unresolved checks, screenshots, and the primary user walkthrough.
Finance's existing contract remains [PHASE_3_FINANCE.md](../product/PHASE_3_FINANCE.md).
The shared [motion system](../design/MOTION_SYSTEM.md) governs local reveals,
navigation guidance, state changes and reduced-motion behavior.
