# Current development state

Phases 1–3 and the Phase 4 Entrepreneurship implementation are present. Current
Phase 4 work is on `feature/phase-4`, uncommitted, alongside preserved timer,
Engineering, Finance and shared motion work. The repository is authoritative for
what exists; the master specification also describes future work.

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
  effective hourly rate. No Phase 5 work.
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
