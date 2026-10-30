# Interview-guide domain contracts

These domain invariants remain useful independently of the removed design proposal. Current implementation is documented in `docs/design/ENTREPRENEURSHIP_EXPERIENCE.md`.

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

## Shared editor ownership

Share generic document validation, editor capabilities, autosave/conflict recovery and import/export where appropriate. Save queries, authorization, media ownership and routing remain domain-owned. Guides do not attach to Content or ContentVariant and do not require an unconstrained polymorphic document store.
