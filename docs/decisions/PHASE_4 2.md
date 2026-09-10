# Phase 4 — implementation decisions

Approved implementation, 8 September 2026. Work is on `feature/phase-4`;
the existing timer, Finance, Engineering and motion changes are preserved.

- Keep immutable factual revisions for interactions and observations, quoted
  offer terms, outcome events, and the evidence versions used by an assessment.
  Editorial company labels and unrelated notes do not invalidate source meaning.
- Company–niche and company–WorkSource links are current relationships. Capture
  explicit context snapshots on historical facts instead of maintaining temporal
  membership machinery. Session context is a snapshot, not a revision subsystem.
- Interaction capture and explicitly added observations, evidence and follow-ups
  save atomically. A capture key identifies one retryable submission; manual batch
  outreach creates one actual event per selected company in the same transaction.
- Replies link explicitly to an earlier logical interaction. Parent and ownership
  checks apply together. Unlinked replies remain legitimate records.
- Active observation evidence is unique by Problem and logical Observation;
  historical assessment bases retain the exact referenced version.
- Offer pricing includes fixed, hourly, per-unit and recurring quotes with an
  explicit interval. Unknown, free, proposed, accepted and received stay distinct.
- Business receipt allocation belongs to Finance. All transaction writers share
  its row lock. Session attribution and business attribution are independent
  dimensions of one receipt, never additive income.
- No Contact directory, email sending, AI, billing, projected recurring income,
  business hourly rate, acquisition ROI, sales pipeline or Phase 5 functionality.

## Delivery and verification

Build Market → interactions → evidence → offers → Finance attribution → session
context → overview. Inspect the first Market/interaction experience before
extending its patterns. Only disposable local fixtures may be used for testing.
Record actual checks and screenshots here as implementation proceeds; unfinished
checks are not acceptance claims. No commit, push or deployment is authorized.

## Shipped journeys

1. **Market → listen:** add a niche and company, retain their context, then log an
   interaction from the overview, journal or company page. The compact save needs
   only event kind, date and summary. Search or create a company inline. Expand
   context, an observation/problem interpretation, or an explicitly dated next
   action only when useful. Those additions save atomically with the interaction.
2. **Outreach → reply:** select actual recipients in manual batch capture, confirm
   the messages were sent, and save one event per company. A reply may explicitly
   reference an earlier event; the source detail links to recorded replies.
3. **Source → judgment:** keep exact words or a paraphrase and its source context;
   link support, contradiction or context to a Problem. Read sources grouped by
   company and record a scoped assessment with its selected basis. Source histories,
   correction reasons and focused before/after reconfirmation remain available.
4. **Understanding → offer:** shape a company-specific scope and fixed, hourly,
   per-unit or recurring quote. Save a draft, then record the actual proposal and
   outcomes. New terms create a new revision. After acceptance, explicitly create
   or link a WorkSource, choose Not now, or indicate none is needed.
5. **Actual receipt → attribution:** record real income in Finance, open its detail,
   and attribute a positive part to a company and optionally its proposed offer.
   Deposits, installments and split receipts remain actual transaction facts.
   Material corrections require review; deletion withdraws source attribution while
   keeping its historical snapshot and assessment basis.
6. **Focus → optional capture:** start an Entrepreneurship session with optional
   company/niche context. Complete it normally; only then choose whether to record
   an actual interaction. Declining does not nag or fabricate records.

## UI and cross-domain changes

The overview leads with exploration, market words and chosen next actions. Market
uses searchable company rows and exploration cards. Interactions read as a journal;
Problems separate the original claim, source words, interpretation and judgments.
Offer pages give scope and quote terms primary space, alongside outcome history,
actual receipts and next actions. Management actions use shared contextual menus.
Forms open on request, protect unsaved entries and preserve failed/stale submissions.

The existing Finance dialog, form guard and creatable control were narrowly promoted
to shared UI; Finance imports retain compatibility aliases. Phase 4 consumes the
approved motion tokens, native dialog lifecycle, local disclosure/reveal and navigation
patterns. Reduced motion changes presentation without delaying saved-state application.
No dependency or overlay framework was added.

Finance transaction edit/delete now shares its transaction row lock with business
attribution. Finance owns the receipt service and queries; Entrepreneurship consumes
those results. Session capture/DTOs gained owned context snapshots while preserving
completion idempotency and the recent overlay/navigation fix. Home and Finance
attention gained links to explicit business follow-ups and changed sources.

## Data safety

Four additive migrations were applied to the verified local PostgreSQL `become`
database. No reset, applied-migration edit, production access, commit, push or deployment
was performed. Current reference activities were added without classifying old sessions.

Integration tests create and remove their own users. Browser fixture cleanup records
only successful sign-up responses made by that test's page, then deletes those exact
owned users and dependencies. Visual inspection used a separately named disposable
account; it and its owned records were removed after screenshots. The exact QA
account count was verified as zero. The screenshot dataset is not part of normal
application data.

## Verification — 8 September 2026

- **Passed:** Prisma schema validation and generated client; TypeScript and ESLint;
  production Next.js build using `next build --webpack`.
- **Passed:** `RUN_BUSINESS_INTEGRATION=1 RUN_FINANCE_INTEGRATION=1 vitest run`:
  **121 passed**, **3 skipped**, 18 passing test files and one skipped file.
  Real PostgreSQL checks include atomic retries/rollback, wrong-owner/parent links,
  reply correction/cycles, logical-source uniqueness, material/editorial changes,
  retained assessment bases, recurring quote immutability, WorkSource choices,
  split receipts/installments/currencies, allocation/edit/delete races, independent
  Session and business attribution, archived follow-ups, and authoritative completion.
- **Skipped:** three global Engineering reference-catalog integration tests requiring
  `RUN_REFERENCE_DATA_INTEGRATION=1`. That catalog synchronization was outside the
  disposable Phase 4 fixture scope; these are not counted as passed.
- **Passed:** all **18 Phase 4 Playwright checks** across desktop, tablet and mobile
  profiles, including company edits, browser Back, archive/restore completion,
  receipt review/deletion, dirty-dialog protection, slow batch saves and optional
  post-completion capture.
- **Unresolved regression:** an earlier combined browser run had
  62 passes and one failure in the existing mobile Engineering unsaved-project-form
  test. An isolated traced rerun passed, but subsequent repeats reproduced failures.
  Three untraced repeats failed; a bounded diagnostic repeat had one pass and one
  timeout. A hydration/history timing issue is suspected, not established. The
  Engineering guard and its test were restored unchanged after diagnosis. This
  failure remains unresolved; the complete regression suite is not claimed green.
- **Visual inspection:** approximately 1440×1000, 820×1180 and 390×844; sparse and
  ten-company Market data, long source prose, conflicting evidence, a scoped judgment,
  a recurring proposal and explicit follow-up. Keyboard dismissal/focus return,
  failed and slow saves, reduced motion, timer recovery and navigation have browser
  coverage. Emulated profiles are not physical Safari/iOS device verification.
- **Unverified:** physical devices, deployed production operation and large-scale
  load. No claim of a formal accessibility audit. The PostgreSQL driver emits a
  dependency deprecation warning about concurrent queries; the exercised invariants pass.

## Screenshot handoff

All images show disposable inspection data and the actual local application:

- [Overview, desktop](../development/phase4-qa/overview-desktop.png)
- [Market, desktop](../development/phase4-qa/market-desktop.png)
- [Problem, desktop](../development/phase4-qa/problem-desktop.png)
- [Problem, tablet](../development/phase4-qa/problem-tablet.png)
- [Problem, mobile](../development/phase4-qa/problem-mobile.png)
- [Loading state, desktop](../development/phase4-qa/loading-desktop.png)

Open `/entrepreneurship` on the local app to inspect the new workspace using your
own account. Screenshots preserve the examples after the disposable fixture is removed.

## Remaining product limits

Company/niche and WorkSource relationships are current links with historical fact
snapshots, not full membership timelines. Interaction pickers show recent source
candidates; company search and the main journals/lists provide bounded navigation.
The module does not send messages, infer missing replies, project revenue or certify
that a hypothesis is true. Those boundaries are deliberate, not unfinished billing
or CRM screens. Broader device and scale testing remains future verification work.

## Niche-first product hierarchy correction

The Phase 4 entry now prioritizes current and past niche explorations, with a
dedicated workspace and secondary global history. Niche + NicheDecision remain
the lifecycle architecture. One additive OfferNiche participation table supplies
the missing explicit offer context without deriving it from company memberships
or rewriting quoted history. No existing records were backfilled or reset.

See [the correction and verification report](../development/PHASE_4_NICHE_FIRST.md)
for route structure, scoped creation, timer behavior, repeated-exploration limits,
tests and responsive screenshots. This supersedes the earlier Market-first
entry description while retaining the acceptance corrections and relational model.
