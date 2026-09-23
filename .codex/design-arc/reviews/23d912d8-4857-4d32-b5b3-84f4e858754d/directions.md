# Direction gate

## Settings and evidence

- Evidence mode: benchmarks
- Approval mode: guided
- Graph assistance: on
- Benchmark provider requested: Mobbin
- Benchmark provenance used: official Linear, HubSpot, Intercom, Dovetail and W3C product guidance because Mobbin full flows require a paid entitlement

## Direction A — Guided investigation (recommended)

### Journey

Snapshot is the home and answers three questions in order: What do we know? What is uncertain? What should I do next?

The non-blocking journey rail is:

1. Scope — define the exploration and B2C/B2B audiences.
2. Reach — targets, outreach, replies, follow-ups and no-contact attempts.
3. Learn — conversations, direct observations and public sources.
4. Decide — current problems, claims, contradictions and direction decisions.
5. Test — offers, responses and outcomes.

The user can enter any area, but Snapshot always marks the current focus and proposes one next useful move with a reason.

### Screens and states

- Replace Overview with Snapshot.
- Merge Audience into Scope and the audience-specific knowledge lanes on Snapshot.
- Replace Evidence with Learn, containing separate Sources and Observations views.
- Move outreach and no-contact attempts out of Evidence into Reach.
- Move Problems under Decide without weakening the existing supporting/contradicting evidence model.
- Move Offers under Test.
- Keep All activity and synthesis history as secondary views, not primary navigation.
- Add a Conversation detail workspace with a message thread in the center and context/observations on the side.

### “So far we know”

- One synthesis area with B2C, B2B and Cross-market/Unresolved lanes.
- Each statement is a reviewable claim with supporting count, contradicting count, last updated date and source drill-down.
- Separate observed facts from the user's current interpretation.
- Show important unknowns and thin coverage beside the claims.
- Version published snapshots so the user can see how understanding changed.

### Key interaction model

- Outreach starts in Reach.
- A reply opens or advances a conversation thread in Learn.
- A message, passage or note can be kept as an observation.
- An observation can support or contradict a problem claim.
- A decision records what changed and why.
- A tested offer records its outcome and feeds the next Snapshot.

### Conversation design

- Modern two-sided message bubbles with sender, timestamp and channel.
- Composer can add messages from either side for manually reconstructed conversations.
- Right panel contains participant, company, audience context, conversation status, follow-up and linked observations.
- Selecting a message exposes `Keep as observation`; messages do not become evidence automatically.
- Existing summary-only conversations remain summaries. The migration must not invent historical messages.

### Interview guides

- Add `Interview guides` under Learn because guides prepare the learning activity; surface `Use guide` from relevant Reach follow-ups and participants.
- Seed the exploration with two clear empty slots, B2C and B2B, but model guides as records rather than hard-coded singleton fields. The user may later need discovery, problem-validation or offer-feedback guides within the same audience.
- Each guide records its research objective, market type, optional audience segment, expected duration and reusable document.
- Call the object a guide rather than a script in the interface: it provides structure but permits skipping, reordering and unplanned follow-up.
- Support semantic question blocks with a prompt, why it is being asked and optional probes. Ordinary headings, paragraphs and lists remain available.
- A guide has an editable draft and deliberate published revisions. Every conversation links to the immutable revision it used.

### Conduct interview flow

1. Start from an upcoming Reach item, participant, company or interview guide.
2. Confirm participant, audience context and guide revision.
3. Open a split workspace: guide on the left, live conversation thread on the right; context and linked observations live in a secondary drawer.
4. `Ask` adds the selected guide prompt as a message from the interviewer and moves focus to the participant composer. Free-form questions remain possible.
5. Messages always show an explicit speaker label; visual side alone never determines authorship.
6. Autosave the in-progress interview. Leaving it creates a resumable draft rather than evidence.
7. Finish with a short debrief: outcome, next action, selected observations and optional summary.
8. The completed conversation appears in Learn; its selected observations may support or contradict claims in Decide.

On narrow screens, the conversation stays primary and `Guide 3 of 8` opens the guide as a sheet. The user never has to manage two cramped columns.

### Editor architecture

- Reuse the existing Tiptap editor engine, document validation, autosave, conflict handling, import/export, printing and navigation protection.
- Extract a domain-neutral editor component with injected identity copy, placeholder, capabilities and save/media/document adapters.
- Keep Content and Entrepreneurship persistence separate. Do not attach interview guides to `Content` or `ContentVariant`, and do not add an unconstrained polymorphic `ownerType/ownerId` document table.
- Let the Content wrapper retain its current variant semantics and image ownership.
- Let the Entrepreneurship wrapper own guide metadata, draft concurrency and immutable published revisions.
- Make editor extensions configurable. Content can retain tables and owned images; interview guides can start with headings, lists, links and semantic question blocks, avoiding a toolbar that is heavier than the interview job.

### Interview-guide states

- Empty B2C or B2B slot.
- Draft guide with autosave pending, failed and conflict states.
- Published guide ready to use.
- In-progress interview pinned to one published guide revision.
- Resumable, cancelled and completed interview states.
- Guide updated while an interview is open: the interview remains pinned to its original revision and may opt into the new revision only before any messages are recorded.
- Archived guide remains readable from historical conversations.

### Motion

- Stable journey rail and Snapshot layout.
- Local expansion for claim evidence, source previews and the conversation detail panel.
- Brief state confirmation when an item moves from message to observation or observation to claim support.
- No decorative page transitions. With reduced motion, state changes remain visible through text, icons and focus movement.
- Provenance: Design Arc judgment based on the repo motion system and W3C orientation guidance; not copied from a benchmark.

### Benefits

- Clearest route through the work while allowing non-linear exploration.
- Fixes the outreach/evidence collision at the information-architecture level.
- Gives “So far we know” a first-class home.
- Makes the future analyst additive rather than necessary for basic comprehension.

### Tradeoffs and complexity

- Medium-high refactor: navigation, queries and interaction presentation change; the existing evidence history can largely remain authoritative underneath.
- Requires a new message-level model if exact transcripts are implemented.
- Requires a domain-neutral seam around the existing editor and a domain-owned interview-guide model; reusing the Content persistence model would create incorrect ownership.
- Semantic question blocks and the live conduct mode are more work than simply exposing the current editor, but they prevent the guide from becoming an isolated document with no relationship to conversations.
- Requires explicit rules for what qualifies as a current claim and when it becomes stale.

### Phase 8 boundary

- Do not start with the broad Phase 8 analyst.
- First ship a deterministic, user-authored Snapshot with counts, curated claims, contradictions, coverage gaps and citations.
- A narrow later Phase 8 slice may draft an updated synthesis and next research question from bounded sources. The user reviews and publishes it; AI never silently changes the current truth.
- Phase 8 may later draft or review a guide against the current evidence gaps and flag potentially leading questions. It must never silently publish questions or rewrite the revision already attached to a conversation.

## Direction B — Research notebook

### Journey

Sources -> Observations -> Insights -> Decisions, with Outreach as a separate utility.

### Screens and states

- Research inbox for conversations, notes and public sources.
- Highlighting/tagging surface to turn passages into observations.
- Insight boards for B2C, B2B and cross-market themes.
- Decision log with linked insight sets.

### Benefits

- Strongest evidence discipline and traceability.
- Best fit for deep qualitative research and the transcript idea.

### Tradeoffs and complexity

- Weaker entrepreneurial momentum: offers and outcomes feel appended rather than part of the main journey.
- Adds more curation steps and risks making quick capture feel heavy.
- High interaction-design and data-model complexity.

### Unproven question

- Whether the user will consistently highlight and curate enough material for the insight layer to stay useful.

## Direction C — Pipeline workspace

### Journey

Targets -> Outreach -> Replies -> Conversations -> Problems -> Offers.

### Screens and states

- Funnel or stage view for targets and interactions.
- Stage-specific work queue and metrics.
- Conversation and evidence detail as drawers or secondary pages.

### Benefits

- Operationally obvious and excellent for daily outreach volume.
- The next action is easy to infer from pipeline state.

### Tradeoffs and complexity

- Risks reducing Become to a generic CRM or kanban flow.
- The path is clear, but “So far we know” remains secondary.
- Ill-suited to discoveries that legitimately move backward or cut across stages.

### Unproven question

- Whether the entrepreneurship workflow is repeatable enough to justify fixed stages without distorting the research process.

## Recommendation

Choose Direction A. It combines Linear's current-state/history split, HubSpot's explicit activity timeline, Intercom's thread-first conversation pattern and Dovetail's source-to-insight traceability, while retaining Become's non-linear and historically honest domain model.

Direction B should influence the Learn and synthesis details. Direction C should influence Reach filters and queues only; it should not become the product's top-level model.
