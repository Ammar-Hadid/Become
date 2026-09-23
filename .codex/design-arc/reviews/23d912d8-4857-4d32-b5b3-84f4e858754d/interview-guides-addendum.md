# Interview guides addendum

## Recommendation

Add exploration-scoped `Interview guides`, initially presented as one B2C starter and one B2B starter. Treat those as recommended active guides, not as two permanent database fields.

The clean ownership chain is:

`Exploration -> Interview guide -> Published guide revision -> Conversation -> Messages -> Selected observations`

The guide prepares the interview. The conversation records what actually happened. Observations are deliberately extracted. None of those concepts should collapse into another.

## Where guides live

- Primary home: `Learn -> Interview guides`.
- Contextual entry: `Use guide` from an upcoming Reach follow-up, a person/company, or an empty conversation.
- Snapshot entry: when the next useful move is an interview, the primary action opens the relevant active B2C or B2B guide.
- Guides remain exploration-scoped. A domain-wide template library is not needed for the first version.

## Guide library

The first view shows two prominent starter cards:

- B2C interview guide
- B2B interview guide

Each card shows draft/published state, last edited, last used and the current research objective. `New guide` remains available for a later discovery, problem-validation or offer-feedback guide without complicating the initial choice.

Useful actions:

- Edit
- Preview interview mode
- Use in interview
- Duplicate to B2C/B2B
- Publish update
- View revision history
- Archive

Do not build live shared sections between B2C and B2B in the first version. Duplication is predictable; invisible cross-document updates are not.

## Authoring model

The editor begins with guide metadata above the document:

- Research objective: what decision should these interviews inform?
- Audience: B2C, B2B or both, with an optional existing segment.
- Expected duration.
- Status: draft or published.

The document supports ordinary text plus a semantic `Interview question` block:

- Prompt.
- Intent: what this question is trying to uncover.
- Optional follow-up probes.
- Stable internal question ID.

Recommended template:

1. Opening and consent.
2. Warm-up and context.
3. Past behavior and current workflow.
4. Focused probes.
5. Existing alternatives, cost or consequences.
6. Closing and permission to follow up.

The interface may offer methodological reminders, but it does not prevent deviation or require every question to be asked.

## Conduct mode

Desktop uses a two-pane workspace:

- Left: guide outline and full question cards.
- Right: conversation thread and composer.
- Secondary drawer: participant, company, audience, follow-up and linked observations.

The current question remains visible. `Ask` records it as an interviewer message; the composer then switches to the participant. The sender toggle always says `Me` or the participant's name so attribution never relies only on bubble position or color.

The interviewer may:

- skip or reorder questions;
- add an unplanned interviewer message;
- capture the participant's response;
- bookmark a message for the debrief;
- create an observation immediately when it will not disrupt the interview.

On mobile, the thread is primary. A persistent `Guide n of m` control opens the guide as a sheet and returns focus to the composer after `Ask`.

## Finish and recovery

`Finish interview` opens a lightweight debrief:

- conversation outcome;
- next action;
- two or three key takeaways;
- bookmarked messages to keep as observations;
- optional summary.

The app must support:

- autosave pending, failed and retry;
- leave and resume;
- cancellation without destroying captured messages;
- guide changed during an active interview;
- guide archived after use;
- completed conversation with no promoted observations;
- historical summary-only conversations without invented messages.

## Domain model requirements

Exact table names remain an implementation decision, but the model must preserve these invariants:

- A guide belongs to one user and one exploration.
- Audience scope uses Become's existing B2C/B2B audience semantics and may optionally narrow to an existing segment.
- The editable draft uses optimistic concurrency independently from semantic publication history.
- Publishing creates an immutable guide revision.
- A conversation records the exact guide revision used, or explicitly records that no guide was used.
- Messages have explicit speaker identity, occurrence time and stable order.
- A message may reference the guide question that prompted it without becoming evidence automatically.
- Corrections preserve message and conversation history.
- Observations cite the source conversation and, where practical, the source message.

## Reusing the current editor cleanly

Current evidence:

- The Tiptap engine and toolbar live inside a component typed directly to `ContentScriptView`.
- Header copy, placeholder, return route, variant label and owned-image URL rules are Content-specific.
- Content persistence lives on `ContentVariant` and cannot correctly represent an exploration-owned guide.

Refactor seam:

1. Extract the editor engine and generic document types into a shared UI module.
2. Make shell labels, placeholder, extension set and capabilities injectable.
3. Generalize autosave around `{ document, expectedVersion, operationKey }` without domain IDs.
4. Keep import/export helpers generic where their behavior is truly identical.
5. Keep save queries, authorization, media ownership and routing in domain-specific wrappers.
6. Add the question extension only to the Entrepreneurship guide configuration.

This gets reuse without turning the editor into a generic persistence subsystem or coupling Entrepreneurship to Content.

## Suggested delivery slices

1. Extract the reusable editor seam without changing Content behavior.
2. Add exploration-scoped guide CRUD, B2C/B2B starter cards and revision publishing.
3. Add read-only interview mode and link a fixed guide revision to a conversation.
4. Add message-level conversation capture with explicit speakers.
5. Add semantic question blocks, `Ask`, bookmarks and the debrief flow.
6. Feed completed conversations and selected observations into Snapshot.

Phase 8 is not required. Later, AI may propose a guide from known gaps, review for leading questions or extract candidate observations, but every generated or extracted result remains reviewable and source-linked.

## Benchmark provenance

- HubSpot Playbooks supports the separation between reusable guidance and the interaction logged from using it.
- User Interviews supports flexible moderator guides, open-ended prompts and room for follow-up.
- Dovetail supports keeping the research question, guide, raw source material and synthesized findings distinct but connected.
- Mobbin was not used for this addendum because the installed account still lacks access to relevant complete flows.
