# Benchmark evidence

## Provenance

- Requested provider: Mobbin
- Mobbin result: the installed connector and logged-in browser account both require a Pro entitlement for the relevant full journeys
- Substitute evidence: current official product documentation, inspected 2026-09-21
- Confidence boundary: behavior and information-architecture patterns only; no unsupported claims about complete visual journeys

## Linear: current state plus update history

Source: https://linear.app/docs/initiative-and-project-updates

- The most recent project or initiative update is visible on the overview.
- Previous updates live in an Updates tab.
- The history combines authored updates with relevant property changes.
- Updates pair a concise progress statement with a health indicator and can become stale.

Fit for Become:

- Put the current synthesis directly on the exploration Snapshot.
- Keep prior published understandings in a separate history rather than forcing the user to reconstruct change from records.
- Show when the current understanding is stale because new records have arrived.

## HubSpot: activity belongs to an activity timeline

Sources:

- https://knowledge.hubspot.com/records/filter-activities-on-a-record-timeline
- https://knowledge.hubspot.com/records/work-with-records
- https://knowledge.hubspot.com/records/view-activity-summaries-on-records

- Record pages separate identity and associations from the main activity surface.
- The activity timeline can mix operational events because its purpose is explicitly activity, and it provides type, owner and time filters.
- Summaries can sit above the timeline while the full chronology remains available beneath them.

Fit for Become:

- Outreach, failed attempts and replies belong in Reach or All activity, not in Evidence.
- A mixed ledger is acceptable only when its label and filters make the mixed semantics explicit.
- The exploration should summarize above the chronology rather than presenting chronology as synthesis.

## Intercom: thread first, details beside it

Sources:

- https://www.intercom.com/help/en/articles/6258745-the-inbox-explained
- https://www.intercom.com/help/en/articles/6433002-start-a-conversation-from-the-inbox
- https://www.intercom.com/help/en/articles/200-intercom-reports-explained

- The primary workspace separates navigation, conversation list, active conversation and contextual details.
- A conversation is a real message thread with a composer; contextual details are secondary.
- Intercom distinguishes an outbound message from a conversation until the recipient replies.

Fit for Become:

- The requested modern chat interface belongs in Conversation detail, not inside the Evidence list.
- Outbound outreach remains an operational attempt until a reply creates a real thread.
- Selected messages or passages can be promoted into observations without making every message evidence automatically.

## HubSpot Playbooks: reusable guidance applied inside a live interaction

Source: https://knowledge.hubspot.com/playbooks/use-playbooks

- A playbook is authored once, then opened in the context of a contact, company or other record while speaking with that person.
- Playbook content can contain prompts and questions with open text or structured answer fields.
- Entries autosave as a draft; completing the playbook deliberately logs the interaction and can create a follow-up.
- Recommendation rules can surface the appropriate playbook for the current record and context.

Fit for Become:

- Keep the reusable interview guide separate from each conversation that uses it.
- Open the guide inside the live conversation workspace with the participant and exploration already known.
- Autosave the in-progress interview, but require a deliberate finish step before it becomes a completed conversation.
- Preserve the exact guide revision used so later guide edits do not rewrite the historical interview context.

## User Interviews and Dovetail: guide, not rigid script

Sources:

- https://www.userinterviews.com/ux-research-field-guide-chapter/user-interviews
- https://dovetail.com/research/research-quality-standards-democratized-customer-interviews/
- https://www.userinterviews.com/blog/interview-snapshot-template

- A moderator guide should begin with a concrete research question, use open questions and leave room for spontaneous follow-up.
- The guide should capture warm-up, core questions, probes and a closing rather than prescribe an interrogation.
- Research quality improves when the research question, guide, raw notes or transcript, and findings remain together but semantically distinct.
- A short post-interview snapshot captures a few takeaways and source timestamps; it supplements rather than replaces raw notes.

Fit for Become:

- Name the feature `Interview guides` even if the user informally calls them scripts.
- Give question blocks an optional intent and follow-up probes, while allowing the interviewer to skip, reorder and ask free-form questions.
- Keep transcript messages, observations and post-interview interpretation separate.
- End an interview with a short debrief that selects observations and next actions instead of forcing synthesis during the call.

## Dovetail: raw material becomes highlights, insights and reports

Sources:

- https://docs.dovetail.com/help/what-is-dovetail
- https://dovetail.com/help/take-notes-and-upload-data/

- Raw research material is distinct from highlights, themes or insights, and reports.
- Findings remain traceable to the source material that supports them.

Fit for Become:

- Preserve a semantic ladder: Activity and sources -> observations -> current claims -> decisions.
- “So far we know” is the insight layer, not a renamed activity feed.
- Every synthesis statement should reveal its supporting and contradicting records.

## W3C: explicit orientation

Sources:

- https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/
- https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p01-clear-purpose/
- https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation
- https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels

- A process should make completed, current and pending steps understandable.
- Page purpose, navigation order and labels should remain explicit and consistent.

Fit for Become:

- Replace the current entity-only tabs with a journey model that makes the current activity and next move visible.
- Keep the journey non-blocking: it guides rather than gates access.

## Cross-benchmark conclusion

The strongest shared pattern is not a dashboard or a kanban board. It is a layered workspace:

1. Current understanding and next move.
2. A clear activity or work surface.
3. Source-level records and history on demand.

Become should use that pattern while preserving its stronger evidence semantics and historical truth.

For interviews, the equivalent layered pattern is:

1. A reusable, audience-scoped interview guide.
2. A live conversation that may use a fixed revision of that guide.
3. Raw messages or notes from the conversation.
4. Deliberately selected observations and a post-interview snapshot.
