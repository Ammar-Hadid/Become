# Become

Become is a personal operating system for tracking growth across the areas of life that matter most.

It connects intentions, actions, time, outputs, outcomes, and reflection so progress can be measured from evidence rather than memory or feeling.

The core idea is simple:

> Who am I becoming?

Become is designed as a long-term system rather than a short-term productivity tracker.

---

## Current Status

Become is under active development.

### Phase 1: Foundation

Implemented:

- Authentication
- Configurable domains and activity types
- Global session timer
- Active-session recovery after refresh
- Session history
- Read-only Session Details
- Week, month, season, and year analytics
- Responsive desktop, tablet, and mobile UI
- PostgreSQL + Prisma persistence
- Automated Vitest and Playwright coverage

### Next

**Phase 2: Engineering**

Phase 2 extends the generic session foundation with Engineering-specific concepts such as projects, outputs, learning evidence, and deeper Engineering analytics.

See:

- [`docs/product/MASTER_SPEC.md`](docs/product/MASTER_SPEC.md) for the long-term product specification.
- [`AGENTS.md`](AGENTS.md) for engineering and coding-agent conventions.

---

## Product Model

Become is built around the flow:

```text
Intentions
    ↓
Actions
    ↓
Time
    ↓
Outputs
    ↓
Outcomes
    ↓
Learning
    ↓
Direction