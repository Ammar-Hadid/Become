# Phase 5: Seasons and Direction

Phase 5 adds a user-owned seasonal identity around fixed calendar quarters, canonical cross-domain goals, bounded experiments, and evidence-first progress. It does not implement automatic COTS discovery, recurring-commitment compliance, rich reviews, AI judgments, or later product phases.

Backend ownership stayed with the parent Astra agent. The frontend implementation is owned by the existing real `gpt-5.6-sol` agent with `xhigh` reasoning, verified against its runtime configuration. The pre-existing Phase 4 working tree remains in place; no branch change, commit, push, deployment, or VPS access is part of this work.

## Ownership and identity

`UserSeason` is unique per user/year/quarter. Quarter boundaries remain derived from the existing calendar model in Europe/Amsterdam. Opening saves are incremental and non-blocking. Joining late retains the calendar dates; completing the opening fulfills the current midpoint/final-stretch check-in so it does not immediately demand another return.

`Goal` is canonical and independent of a season. `SeasonGoal` describes PRIMARY or SUPPORTING participation, with one optional primary goal per season. It creates no parent/child hierarchy, duplicated goal, or copied measurement period. A goal can participate in several chapters while retaining its own dates and evidence.

`Experiment` has its own question, approach, horizon or stopping condition, expected evidence, optional goal link, result, learning, and explicit outcome. A repeat creates a distinct attempt linked to its concluded predecessor. Conversation measurements can explicitly choose all matching records in their date/scope or only direct responses to selected outreach. Merely sharing a week is never trial attribution, and reaching a threshold does not establish causation.

An outreach-only criterion without a selected cohort is not configured. Once a cohort is selected, no qualifying responses is a recorded zero. Source pagination retains full-set totals and a definition/evidence fingerprint; a changed reading requires refresh before another page is combined with it.

Composite owned foreign keys and service validation enforce ownership. Optimistic versions reject stale forms; stable operation keys make explicit submission retries idempotent. Advisory locks serialize each user's relevant intention or quarter. Conclusions run in serializable transactions and require the current evidence preview fingerprint. They retain their source snapshot if live facts later change.

Confirmed serialization/deadlock rollbacks retry at most three complete transactions, including a fresh evidence read. This recognizes both Prisma and driver-adapter error shapes. Unknown network failures are not automatically retried by the server; the client retains the same submission key to recover an uncertain save before applying newer edits.

## Measurement contract

Domain tags organize intentions; they do not filter measurements. Each criterion owns its metric, canonical source selections, dates, and threshold. Multiple criteria use explicit ALL/ANY semantics. Money uses exact minor-unit BigInts and one currency; the frontend receives formatted labels and server-authored qualification explanations.

| Criterion | Authoritative qualification | Boundary |
| --- | --- | --- |
| WorkSource income | Actual INCOME / EARNED_WORK transactions under the selected WorkSource, currency and receipt dates | No name matching, gifts, DUO, transfers, expected earnings, or unrelated sources |
| Company receipts | Confirmed, non-withdrawn Finance allocation portions at the selected company and optional offer revision | Only each qualifying portion; pending review is excluded |
| First recurring-company payment | Same newly paying company and revision, accepted monthly terms, qualifying attributed receipt after acceptance in the window | Not MRR or proof of an ongoing recurring relationship |
| Conversations | Current non-withdrawn CONVERSATION revisions in exact niche/company/date scope | Outreach, replies and superseded versions excluded |
| Conversation companies | Distinct canonical company IDs among those conversations | Separate from interaction count |
| Focus time | Completed sessions in selected recorded context, clipped to date boundaries | Running time is provisional; time proves no outcome |
| Engineering evidence | Current records in selected project/type/date scope | Does not independently verify completion or quality |
| Engineering project completed | The selected canonical Engineering project's current `status` is `COMPLETED` | Current state, independent of goal dates; no output/time threshold or evidence date window. Reopening makes live evidence unmet; archiving leaves status eligible. |
| Finance savings goal | Existing Finance spending, allocation, funding gap and protected-pool calculations | Current as-of readiness; creates no ledger, allocation or expense |
| Qualitative assessment | Dated user confirmation, rationale and optional owned source references | Does not overwrite a domain-derived total |

For a new recurring-company milestone, absence of older payments is insufficient to prove newness. The user must record a company-specific baseline assertion; older confirmed business receipts contradict it, and unresolved historical attribution requires review. The quoted minimum per month is distinct from an optional minimum received amount. A positive partial receipt can establish a first-payment milestone without claiming that a full month was paid. Acceptance and receipt must fall within the defined window; cancellation and other lifecycle events are evaluated at each receipt. Several companies or offer revisions never combine to satisfy the compound condition. More than 100 candidate revisions produces an explicit coverage limitation and asks for narrower scope.

The broader intention “secure ongoing recurring income” still needs a dated qualitative judgment with evidence. Phase 5 does not create subscriptions or silently substitute monthly cash receipts for MRR.

Manual references re-resolve against current owned records. A changed/withdrawn/deleted source, or a changed criterion/horizon, makes the old judgment pending review while preserving its historical evidence. No implicit background write or automatic celebration follows a source update. One source may inform several independent goals without duplicating the source or adding overlapping totals as global output.

Archiving a source entity keeps its historical qualifying facts eligible; it does not imply that those facts were withdrawn. Deleted facts cease to qualify, and missing manual references have no live link. Future measurement windows remain valid, including open-ended horizons, and show when measurement begins rather than claiming a completed zero-result period.

## Lifecycle and history

Goals support active, paused and concluded states plus archive/restore. A configured quantitative goal cannot be concluded as achieved until its required criteria are established. Explicit partial/stopped outcomes remain available. Qualitative goals can be concluded with the user's dated explanation. Experiment conclusions explicitly separate supported/not-supported/inconclusive interpretation from the measurement itself.

Definition edits require a reason. Assessment, lifecycle and definition changes retain meaningful snapshots; history is cursor-paginated. Reopening retains prior conclusions in change history. Live progress is compared with the captured conclusion fingerprint and labeled when facts changed.

Definition history captures source labels as well as canonical IDs, thresholds and horizons. Effective inherited dates and the selected outreach cohort participate in the evidence fingerprint even when the observed number stays unchanged. Closing cards expose a typed captured outcome summary separately from current linked goal readings.

Midpoint and final-stretch cues show only the current relevant moment, can be acknowledged or snoozed, and do not replay missed reminders. Closing after quarter end saves a small chapter snapshot and a `readyForReview` handoff. It changes no goal status or horizon. Captured identity/media/quotes/evidence remain distinct from later corrected live sources. Phase 7 owns rich interpretation and review.

## Filesystem media and Phase 5.5 boundary

Only logical storage keys and metadata are held in PostgreSQL. The configured root is deliberately separate from deployment files:

```text
BECOME_DATA_DIR=/srv/data/become
└── media/
    └── seasons/
        └── <season-id>/
            └── <generated-id>.webp
```

Development defaults to `<repository>/.data/become`, which is gitignored. Production fails closed if the root is missing from configuration, relative, or inside the deployment directory. No VPS is required or accessed by the implementation.

The small `MediaStorage` interface exposes immutable put/read/remove operations. The filesystem adapter validates internally generated logical keys, rejects symlink descendants and traversal, uses exclusive writes with private permissions, and removes empty per-season directories when the final file is cleaned up. Application services own authorization and metadata. A future object-storage adapter can retain existing logical keys.

Provider selection is isolated in `src/lib/storage/services/media-storage.service.ts`; feature services and private delivery use that interface.

Uploads accept still JPEG/PNG/WebP up to 6 MB and 12 megapixels, normalize orientation, strip embedded metadata, and re-encode to bounded WebP. The limit is three active images and twelve active quotes per season. Private authenticated delivery avoids public upload directories and Next's unauthenticated image optimizer. Choosing a poster or featured quote is serialized and protected by a database uniqueness constraint.

Metadata and quotes include acquisition origin, source URL/title, credit, provider/external identity slots, selection time and attribution verification. Current commands accept manual uploads and manual quotes only. Exact quotes require explicit attribution, a source URL and user verification; unknown or paraphrased wording remains labeled. Later edits preserve acquisition provenance. Phase 5.5 can supply selected discovered candidates to the same durable model; no discovery, scraping or candidate pipeline is implemented now.

Files and database transactions cannot form one atomic filesystem transaction. A failed save removes its file only after proving no committed row references it; uncertain outcomes retain the file for deliberate reconciliation. A process crash can therefore leave an orphan under the one dedicated root, not scattered elsewhere. Retiring an image preserves its bytes for historical closing snapshots. Back up PostgreSQL and this data root together. The current deployment assumption is a single shared persistent filesystem on the VPS; separate hosts would need shared storage or an object-store adapter.

## Verification

Focused unit tests cover quarter/day/DST semantics, storage traversal and symlinks, exclusive writes, production-root rules and raster normalization. Local PostgreSQL tests use disposable users and clean up their exact rows and media keys. They cover duplicate submissions, stale versions, owned scopes, primary roles, Outlier exclusions, same-company recurring conditions, partial and pending receipts, lifecycle-at-receipt-time, full-set aggregation, current conversation revisions, explicit trial links, preserved conclusions, repeat attempts, chapter closing and private media limits/provenance.

The implementation is also inspected in the running browser during vertical slices. Final verification results and remaining limitations are recorded in the delivery response rather than being assumed from element existence.
