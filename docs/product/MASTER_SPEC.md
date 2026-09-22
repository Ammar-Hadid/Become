# BECOME

## Master Product, Design & Engineering Specification

You are the lead engineer responsible for creating a brand-new application from scratch called **Become**.

The project directory starts empty. There is no existing codebase, architecture, database, package configuration, or design system to preserve.

Treat this document as the long-term product specification and engineering constitution for Become.

Do not try to implement the entire vision at once. Build it in coherent phases. Start with Phase 1 only, keep the application runnable, test important business logic, and stop after Phase 1 with an engineering handoff.

---

## 1. Product vision

Become is a long-term personal operating system for growth, direction, evidence, and self-understanding.

It is not merely a productivity tracker, habit tracker, timer, finance tracker, CRM, journal, analytics dashboard, or AI wrapper. It combines parts of all of them around one central question:

> **Who am I become, and does my actual behavior support that direction?**

Become should eventually help answer:

- What am I trying to accomplish?
- What am I actually doing?
- Where is my time going?
- What am I producing?
- What am I learning?
- What results am I getting?
- What am I avoiding?
- How is my financial position changing?
- Which activities actually produce meaningful outcomes?
- Which goals and experiments are progressing?
- What decisions did I make and why?
- How am I changing across weeks, months, seasons, and years?
- Are my stated priorities reflected in my behavior?
- Am I confusing activity with progress?

The long-term value comes from accumulated history. A user should eventually be able to compare Season 3 of 2026 with Season 3 of 2031 and understand how their skills, finances, work, projects, experiments, decisions, and priorities changed.

The product philosophy is:

> **Intentions → Actions → Time → Outputs → Outcomes → Learning → Direction**

Time is useful, but time alone is not success. Pair activity with outcomes whenever possible.

---

## 2. Core data and AI principle

> **Database = truth. AI = reasoning.**

Structured application data is the canonical source of truth.

AI may summarize, compare, identify patterns, challenge assumptions, detect possible avoidance, generate hypotheses, recommend actions, and answer questions over stored data.

AI must not invent historical events, metrics, conversations, income, or evidence. It must not silently change historical facts or present hypotheses as facts.

Whenever deterministic code can calculate something reliably, calculate it in code first, then give the facts to AI for interpretation.

Where useful, distinguish:

- FACT
- INFERENCE
- HYPOTHESIS
- RECOMMENDATION

---

## 3. Technology stack

Choose stable, mutually compatible releases available at implementation time.

Use:

- Next.js App Router
- React
- TypeScript
- Node.js LTS
- pnpm
- PostgreSQL
- Prisma ORM
- Better Auth
- Tailwind CSS
- shadcn/ui
- Geist typography
- Zod
- React Hook Form where useful
- Recharts
- dnd-kit
- Luxon
- Vitest
- Playwright
- official OpenAI SDK
- OpenAI Responses API
- Structured Outputs where appropriate

Use a **single full-stack Next.js modular monolith**.

Do not create separate React and Express applications unless a future requirement genuinely demands it.

Use:

- Server Components for server-rendered persistent data where appropriate
- Client Components for genuine interactivity
- Server Actions when they simplify mutations
- Route Handlers for APIs, webhooks, external callbacks, and integrations

Do not introduce Redis, Kafka, GraphQL, microservices, event sourcing, LangChain, LangGraph, vector databases, agent swarms, Kubernetes, or similar infrastructure without a demonstrated requirement.

Professional architecture does not mean complicated architecture.

---

## 4. PostgreSQL and data modeling

PostgreSQL is the canonical store because Become is strongly relational.

Examples:

- Domains → Sessions → Projects → Outputs
- Niches → Companies → Conversations → Problems → Offers → Revenue
- Income Opportunities → Application/Assessment Sessions → Paid Work Sessions → Payments
- Accounts → Transactions → Balance History

Use foreign keys and relational integrity intentionally.

Use database transactions when multiple related writes must succeed or fail together.

Use Prisma for normal relational access and raw SQL where advanced analytics are clearer or more efficient that way.

Do not use MongoDB.

Do not create every future model immediately. Add models when the relevant feature phase needs them.

Potential long-term entities include:

- User
- Domain
- ActivityType
- Session
- EngineeringProject
- Niche
- Company
- Observation
- Hypothesis
- Conversation
- Problem
- Offer
- EmailThread
- EmailMessage
- FinancialAccount
- Transaction
- IncomeOpportunity
- Content
- ContentVariant
- Publication
- Channel
- Goal
- Experiment
- Idea
- Decision
- Review
- DashboardWidget

---

## 5. Money

Never use floating-point numbers as authoritative money values.

Store money in integer minor units.

Example:

€19.99 → `amountMinor = 1999`, `currency = "EUR"`.

Differentiate:

- income
- expense
- transfer

Transfers are not income or expenses.

Moving €500 from checking to savings must not appear as €500 spent and €500 earned.

Support currency explicitly.

Financial calculations must be deterministic and tested.

---

## 6. Authentication, validation, security, privacy

Use Better Auth.

Initially design Become as a personal application, but avoid irreversible assumptions that make future multi-user support impossible.

Do not initially build organizations, teams, billing, enterprise RBAC, or social features.

Use Zod for runtime validation of forms, APIs, webhooks, integrations, imports, and AI structured output.

Treat Become as potentially containing sensitive personal information:

- finances
- emails
- customer conversations
- private notes
- decisions
- goals

Keep secrets server-side. Use secure cookies, proper authorization, input validation, webhook verification, and sane rate limiting where appropriate.

Only send AI the data required for the current task. Do not dump the user's entire history into every AI request.

---

## 7. Visual identity

Name:

# Become

Aesthetic:

# Modern · Minimal · Premium · Serious

But not corporate or sterile.

Become should feel like a calm, beautifully designed personal command center.

Approximate personality:

- 70% serious/professional
- 20% slightly futuristic
- 10% playful/personal

It should not feel like Jira, HR software, a crypto dashboard, a gamer UI, a generic admin template, or a children's habit app.

### Dark palette

```css
--background: #090a0c;
--surface: #111318;
--surface-elevated: #181b21;
--border: #262a32;

--text-primary: #f4f1ea;
--text-secondary: #989ba3;
--text-muted: #666a73;

--primary: #e8a83e;
--primary-hover: #f0b64d;
--primary-subtle: #2a2114;

--success: #54b88b;
--danger: #e56767;
--warning: #d99b42;
```

Identity:

> near-black + warm ivory + amber/gold

Gold should be rare and meaningful. Use it for primary actions, active timers, selected states, important progress, current season indicators, and high-value emphasis.

Avoid excessive gradients, glassmorphism, glow, shadows, and decorative borders.

Do not make each domain aggressively own a bright color. The primary Become identity remains black, charcoal, ivory, and amber. Domain colors may be used subtly in charts and comparisons when differentiation is useful.

Use Geist and tabular numerals for money, durations, percentages, and analytics.

---

## 8. Layout philosophy

Do not turn every piece of data into a card.

Use hierarchy through:

- typography
- whitespace
- alignment
- section structure
- subtle surfaces
- restrained separators
- carefully chosen cards

The UI should breathe.

Prefer calm over loud, clear over decorative, premium over flashy, evidence over gamification, and typography over endless boxes.

---

## 9. Motion and copy

Motion should be subtle and intentional:

- active timer gently becomes visually alive
- charts transition between timeframes
- widget movement feels smooth
- dialogs and navigation feel polished

Avoid:

- confetti
- XP
- levels
- fire emojis
- bouncing achievements
- fake dopamine mechanics

Copy should be concise, calm, direct, intelligent, and occasionally personal.

Bad:
"AMAZING JOB 🔥 YOU CRUSHED FOUR HOURS!"

Better:
"4h 12m Engineering. Longest focused session this season."

Facts are more valuable than empty encouragement.

---

## 10. Core time model

Use one generic Session model for time tracking.

Conceptually:

```text
Session
- id
- userId
- domainId
- activityTypeId
- startedAt
- endedAt
- description
- outcome
- notes
- optional related entity
- justified metadata
```

Do not build independent timer systems for every domain.

Only one unfinished timer per user, whether running or paused. A paused session
must be ended before a different timer can start, across all domains.

Do not use WebSockets simply to count seconds.

When a session starts, store `startedAt`.

Pausing records a UTC break interval on the same Session; resuming closes that
interval. Preserve the original `startedAt` and session context. Focused time is
elapsed time minus recorded breaks, calculated in milliseconds before rounding.
Analytics subtract the intersection of breaks with each reporting window.

After refresh, reload the unfinished session and reconstruct its running or
paused state. Pauses persist indefinitely until explicitly resumed or ended.
Revisioned server snapshots prevent older responses from restoring stale state.

Do not continuously write timer ticks to the database.

---

## 11. Global timer UX

The timer should be globally accessible.

Start flow:

Start Timer → Domain → Activity → Optional related project/entity → Optional description → Start.

Stop flow should remain lightweight:

Stop → duration → optional outcome/notes/domain-specific details → save.

Running sessions expose Pause and End session; paused sessions expose Resume and
End session. Home retains a clear paused-session card with context and frozen
focused time. Ending while paused opens the same optional wrap-up form without
resuming. Cancelling leaves it paused; saving excludes the entire break.

Logging must remain fast.

Completed sessions allow correcting the actual stop time when a timer was left
running. Keep the original start and break records; recalculate focused time in
session history and reporting from the corrected end. Reject times before the
start or in the future.

Do not make timer usage a giant form.

---

## 12. Domains

Initial domains:

- Engineering
- Entrepreneurship
- Finance
- Content

Domains must remain configurable rather than permanently hard-coded.

Potential fields:

- name
- slug
- icon
- optional analytics color
- sort order
- enabled

Activity types belong to domains.

---

## 13. Seasons and timeframes

Become divides each year into four fixed seasons:

- Season 1: January, February, March
- Season 2: April, May, June
- Season 3: July, August, September
- Season 4: October, November, December

Season is normally derived from a date, not stored as redundant quarter-boundary documents.

Important analytics timeframes:

- Week
- Month
- Season
- Year

Support comparisons such as current period vs previous equivalent period.

Be careful with Europe/Amsterdam timezone, DST, ISO weeks, sessions crossing midnight, month boundaries, season boundaries, and year boundaries.

Use UTC for canonical timestamps and Luxon for timezone-aware interpretation.

Test this logic.

---

## 14. Home / command center

The Home page should answer quickly:

- What am I doing now?
- What season is this?
- What happened today?
- How is this week going?
- What deserves attention?
- What is my financial state?
- What important goal or experiment is active?
- Is there a useful insight in my data?

Conceptual hierarchy:

```text
BECOME

Season 3 · 2026
Week 36

Good evening, Ammar.

[ ACTIVE TIMER ]

31h 42m
Focused time this week

ENGINEERING
12h 31m
↑ 8%

ENTREPRENEURSHIP
4h 18m

FINANCE
Income
Spending
Savings

CONTENT
1 creative work in progress

GOALS / EXPERIMENTS

RECENT INSIGHT
```

Do not mechanically reproduce this layout. Design the strongest version consistent with the visual system.

---

## 15. Customizable dashboard

Dashboard widgets should eventually support:

- add
- remove
- reorder
- resize
- configure

Use dnd-kit where appropriate.

Keep widget data/configuration/placement/presentation cleanly separated.

Potential widgets:

- Active Timer
- Today
- Weekly Focus
- Engineering Activity
- Entrepreneurship Pipeline
- Current Niche
- Follow-ups
- Current Savings
- Income
- Spending
- Paid Work
- Season Progress
- Goal Progress
- Experiment
- Recent Decisions
- Parked Ideas
- Content workspace
- AI Insight

Do not build every widget immediately.

---

## 16. Engineering domain

Purpose:

> What am I building, solving, learning, and improving?

Engineering activities:

- coding
- debugging
- architecture
- learning
- testing
- deployment
- code review

Each Engineering session records the setting in which the work happened:

- uni
- internship
- personal
- professional

This context belongs to the session and is independent of its optional project.
It must not be derived historically from `EngineeringProject`. Each project also
stores its own required context from the same enum. Selecting a project when
starting a session prefills the project's context as an editable default, but
the session's stored context remains the authoritative historical value so later
project changes cannot reclassify past work. Selecting a context never selects a
project.

Engineering sessions may optionally link to projects. An `EngineeringProject`
may store an optional nullable `liveUrl` in addition to its repository URL.
Modified project create/edit forms protect against accidental navigation with a
discard confirmation; Phase 2 does not add drafts or autosave.

Engineering projects may also have an optional reusable technology stack through
canonical `Technology` records and an explicit project-technology join. Built-in
technologies are global system records; missing technologies may be created as
user-owned custom records with normalized names and slugs. Technologies belong
to projects only in Phase 2. Do not add technology selection to timer flows or
store technology attribution on `Session`.

Potential outputs:

- feature completed
- bug solved
- concept learned
- deployment
- architecture decision
- technical discovery

Do not force every session to have an output.

Eventually support analytics such as:

- engineering time
- active days
- project breakdown
- activity breakdown
- context breakdown across uni, internship, personal, and professional work
- distinct projects worked on during the timeframe by project context
- time on projects using a technology, clearly labeled as project association
- coding vs learning
- week/month/season/year trends
- features completed
- bugs solved
- concepts learned

The domain should eventually answer:
"What did I actually learn and build this season?"

Project-context counts and Session-context time are separate measures. “Projects
worked on this season by context” includes a distinct project only when linked
Engineering Session time overlaps that season, then groups it by the project's
current context. A future “projects created this season” measure must instead use
an explicitly documented project creation or start-date boundary.

Project-technology buckets may overlap because one project can use several
technologies. Never sum those buckets or describe them as direct time spent using
a technology; stronger attribution requires session-level data that Phase 2 does
not collect. These Phase 2 buckets use the project's current stack rather than a
historical per-session technology snapshot.

---

## 17. Entrepreneurship domain

Conceptual relationship:

> **Niches → Companies → Conversations → Problems → Offers → Outcomes**

Do not reduce entrepreneurship to a generic kanban board.

Potential timer activities:

- niche research
- company research
- outreach
- follow-up
- customer conversation
- sales meeting
- offer creation
- validation
- delivery
- learning
- admin

Pair time with outputs. Five hours researching with zero customer contact is meaningfully different from five hours producing outreach, replies, conversations, and offers.

### Niches

A Niche represents a market being explored.

It may include:

- companies
- observations
- hypotheses
- problems
- conversations
- offers
- outcomes
- research

Do not hard-code any niche.

### Observations vs hypotheses

This distinction is critical.

Observed:
"The company's website says they use Exact Online."

Hypothesis:
"They may have a painful invoice-entry workflow."

Never silently convert hypotheses into facts.

Important claims should remain traceable to evidence.

### Company CRM

Companies may contain:

- name
- website
- email
- contact
- niche
- notes
- research
- stage
- next follow-up

Related data may include outreach, emails, conversations, observations, problems, offers, and outcomes.

Suggested flexible pipeline:

Unresearched → Researched → Draft Ready → Contacted → Replied → Conversation → Qualified → Offer Made → Won/Lost.

Do not force every company through every stage.

### Conversations

Preserve raw notes.

AI may extract structured details such as:

- problems mentioned
- current workflow
- current solution
- previous attempts
- pain severity
- objections
- commitments
- next action

### Problem database

Problems should exist independently from individual companies.

Potential information:

- niche
- title
- description
- validation state
- companies mentioning it
- supporting conversations
- severity
- frequency
- workaround
- existing solutions
- cost
- evidence strength
- supporting evidence
- contradicting evidence

Evidence-backed statements such as "9 of 14 interviewed companies mentioned this problem" must come from actual records.

### Offers

An Offer represents a concrete proposal to exchange value for money.

Conceptually:
Solve X for Customer Y for Price Z.

Possible data:

- company
- problem
- solution
- price
- currency
- date
- status
- response
- objections
- rejection reason
- linked revenue

Evidence hierarchy:

compliment < stated interest < commitment < payment.

### Entrepreneurship analytics

Eventually support:

- time
- companies researched
- companies contacted
- replies
- reply rate
- follow-ups
- conversations
- problems discovered
- problems validated
- offers
- explicit money asks
- customers
- revenue
- conversion rates

---

## 18. Finance domain

Finance is first-class.

It should answer four broad questions:

1. Money: what came in and went out?
2. Financial position: what do I own in liquid accounts and how is it changing?
3. Paid work: how much time am I exchanging for income?
4. Income development: how much time am I investing to create future income?

The goal is to understand:

> **money + effort + opportunities + return on time**

### Financial accounts

Do not store savings as one mutable number.

Model accounts such as:

- Checking
- Savings
- PayPal
- Cash
- Business Account
- Investment Account

Potential fields:

- name
- type
- currency
- active
- includeInLiquidSavings

Support historical balance analysis where useful.

### Transactions

Types:

- income
- expense
- transfer

Potential fields:

- type
- amountMinor
- currency
- occurredAt
- earnedAt
- receivedAt
- account
- destinationAccount
- category
- merchant/source
- notes
- status
- recurring
- linked work/opportunity/business entity where useful

Do not over-model immediately.

### Income classifications

Differentiate earned income from passive/other inflows.

Potential categories:

- earned_work
- business_revenue
- student_finance
- gift
- refund
- reimbursement
- other

Student finance or gifts may increase cash inflow but must not affect effective hourly rate.

### Finance timer activities

Timers measure financial work, not passive money movement.

Potential activities:

- Paid Work
- Opportunity Search
- Application
- Assessment
- Finance Admin

The non-paid income-building activities may be grouped analytically as Income Development.

### Paid work

Support compensation models:

- hourly
- fixed
- task-based
- unknown

A paid work session may link to source/platform, opportunity, project/client, and expected rate.

Expected earnings are not the same as confirmed income.

### Work sessions vs payments

A work session and a payment are separate records and may be linked.

Do not enforce one-session-one-payment.

One project may contain multiple work sessions and one or more payments.

### Income opportunities

Model gig/application opportunities independently.

Sessions may link to an opportunity:

Application → Interview/Assessment → Follow-up → Outcome.

This enables analytics such as:

- opportunity search hours
- application hours
- assessment hours
- acquisition time
- conversion to paid opportunity
- revenue by source
- return on acquisition effort

### Entrepreneurship revenue and finance

Never duplicate the same money.

A €500 business payment should be one financial transaction.

Finance views it as business revenue.

Entrepreneurship may view that same transaction through its linked company/offer/problem.

One financial fact, multiple analytical perspectives.

### Finance analytics

Potential metrics:

- earned income
- received income
- expenses
- net cash flow
- liquid savings
- savings change
- spending by category
- income by source
- paid work hours
- income development hours
- expected income
- confirmed income
- effective hourly rate
- applications
- assessments
- opportunities
- conversion
- acquisition time
- revenue by platform/source
- return on acquisition effort

Definitions must be explicit and deterministic.

---

## 19. Content domain

Phase 6's approved Content model supersedes the earlier YouTube-only proposal. Content should remain lighter to use than Finance or Entrepreneurship.

One creative work has one stable Content identity. It may have several ContentVariants (cuts, formats or languages). Each variant may have several explicitly recorded Publications, each on an owned Channel. Channels represent accounts on YouTube, TikTok, Instagram, or a named OTHER platform.

For example, one short vertical version posted to TikTok, YouTube Shorts and Instagram Reels is **1 Content, 1 Variant, 3 Publications**. Cross-posting never duplicates the creative work. The interface calls ContentVariants “variants” and publications “releases”; each script stays attached to its owning variant.

The everyday journey is:

Idea → Create content → Write or plan → Make/edit a version → Publish to one or more channels → Record results.

Production stages are optional guidance: Planning, Writing, Recording, Editing, Ready. Work can move backward or skip stages. Publication is a separate deliberate record, never inferred from a stage, a plan or a completed timer. Archival preserves historical output and time.

A workspace supports title, purpose/audience, hook, outline, an optional rich-text script, production notes, next step, planned date and an owned thumbnail. Longer writing needs clear saved/pending/failed/conflicted states and protection against stale tabs. Additional variants, channel management and history use progressive disclosure. A variant without a script offers “Write script”; saved content offers “Open script”. Both navigate to `/content/[contentId]/variants/[variantId]/script`. Become’s script editor supports formatting, headings, lists, links, tables, owned images, find/replace, DOCX/TXT import and export, and printing to PDF. It autosaves and supports explicit Save and Ctrl/Cmd+S. Script revisions are independent of hook/outline/production-note revisions, and legacy plain-text scripts remain intact. DOCX content adopts Become’s typography rather than preserving Word page layout.

Use the existing single active Session system for ideation, research, scripting, recording, editing, thumbnails, publishing and analytics. Sessions may be linked to a work and consistent version; general Content work remains possible without either. Preserve snapshots and label measured effort “recorded production time.” Completion does not change production stage or publication.

Publications retain actual date, optional exact time, published title, channel, placement and optional URL. Corrected and withdrawn records retain history. Canonical platform URLs prevent duplicate releases. Reuploads with different platform identities are separate publications.

Manual analytics comes first. Dated lifetime observations support views, likes and comments, preserving observation time, entry time and correction lineage. Latest values are selected separately per metric. Missing is unknown; explicit zero is zero. A 1,000-view reading followed by 1,800 is not 2,800. Observations preceding a corrected release date remain historical but do not qualify as current results.

Authoritative reporting distinguishes Content created, Variants created, Publications made, recorded time during the chosen period, and all-time effort on distinct works released in that period. Preserve Amsterdam date windows, platform/format distinctions and measurement freshness. Goal criteria can count the three output facts; experiments can explicitly select a content cohort. Manual evidence does not become verified platform evidence, causal attribution, audience deduplication or income.

No OAuth, social APIs, autonomous publishing, runtime AI, raw-video hosting, earnings estimates, Campaign/Asset/Distribution framework or rich review engine belongs to Phase 6. Actual money remains in Finance. Future AI/integration ideas remain later-phase proposals.

---

## 20. Global Idea Parking Lot

Ideas live under Direction and remain global across domains. Capture requires only a short title/thought, with optional notes and domain links. No priority score, target date, review quota or classification is mandatory.

An idea may deliberately create Content, a Goal or an Experiment using that destination's canonical creation contract. The destination remains editable before saving; cancellation creates nothing. Promotion and its origin link are atomic and retry-safe. Linking an existing destination is a distinct action. One idea may inspire several outputs and one output may draw on several ideas.

Preserve the original idea, meaningful edit/promotion history and links when archiving. Contextual Content access reads the same global ideas. Direct project/exploration promotion and generalized knowledge-management infrastructure are deferred.

---

## 21. Decision Journal

Decisions preserve consequential choices and the reasoning available at the time. Minimum capture is “What did you decide?” and “Why?” This is a sparse journal, without routine daily-choice logging or quotas.

Optional context includes alternatives, expected outcome, reconsideration trigger, a chosen review date and owned links to Content, Engineering projects, Goals, Experiments, explorations or Seasons. Do not mirror existing domain transition histories into a second ledger.

Edits preserve prior wording without requiring ceremony for typos. Meaningful reversals create a superseding decision. Later dated reflections retain original reasoning and express the user's assessment (Helpful, Mixed, Not helpful, Too early), not an objective correctness score. A review is due only when intentionally scheduled and never blocks ordinary use.

Future AI interpretation and rich reviews remain later phases.

---

## 22. Goals

Goals should be first-class entities.

Potential fields:

- title
- description
- domain
- metric
- target
- startAt
- endAt
- status

Progress should be calculated from real application data whenever possible.

Historical sessions must never be rewritten to make a goal appear completed.

---

## 23. Experiments

Experiments are structured tests.

Potential fields:

- title
- hypothesis
- startAt
- endAt
- success criteria
- metrics
- related domains
- notes
- result
- conclusion
- status

The system must remain generic. Do not hard-code any current personal experiment.

Experiments should answer:
"Did reality support the hypothesis?"

---

## 24. Reviews

Reviews are central long-term functionality.

The process must be:

stored facts → deterministic calculations → structured review context → AI interpretation.

### Weekly review

AI should identify:

- meaningful progress
- changes
- bottlenecks
- possible avoidance
- low-return activity
- contradictions between goals and behavior
- unusually strong outcomes
- patterns worth investigating

Do not praise time merely because it was spent.

Do not manufacture criticism merely to sound tough.

Use evidence.

Provide at most about three high-value recommended actions.

### Monthly review

Summarize meaningful changes in time allocation, outputs, goals, finances, decisions, accomplishments, and bottlenecks.

### Seasonal review

Especially important.

Eventually answer:

- What changed this quarter?
- Where did my time go?
- What did I produce?
- What generated actual results?
- What did I learn?
- Which domains strengthened or weakened?
- How did finances change?
- Which income source performed best?
- What assumptions were disproven?
- What important decisions were made?
- What did I repeatedly avoid?
- What should change next season?

### Yearly review

Create a long-term narrative, not merely annual totals.

---

## 25. AI Analyst

Future Become should provide a conversational analyst over stored data.

Examples:

- What have I been avoiding lately?
- Which niche has the strongest evidence?
- How has personal engineering changed since last season?
- Which projects consumed the most engineering time?
- Which income source has the highest effective hourly rate?
- How much time did I spend applying vs earning?
- Which platform has the worst acquisition return?
- How did savings change this season?
- What did I learn about databases this year?
- Which decisions turned out badly?

The AI should retrieve the actual required data and cite/refer to evidence where practical.

Never answer from vague model memory when structured data exists.

---

## 26. AI implementation architecture

Do not scatter OpenAI calls throughout components.

Create explicit AI use cases, for example:

- weeklyReview
- seasonalReview
- companyResearch
- conversationExtraction
- outreachDraft
- analystQuery
- contentIdeas

Each should have:

- input schema
- context builder
- prompt/instructions
- output schema
- service

Prefer Structured Outputs for machine-consumed responses.

The user remains in control of consequential actions.

AI may analyze, draft, recommend, summarize, classify, and extract.

AI should not automatically send emails, spend money, change goals, delete important data, or rewrite historical facts.

---

## 27. Gmail integration

Future Gmail integration should use the Gmail API and Google Pub/Sub push notifications where appropriate.

Desired architecture:

Gmail → Pub/Sub notification → Become webhook → fetch changed thread/messages → match stored company/contact → persist original email → structured AI extraction → update relevant state.

Store original message content/metadata. AI summaries supplement, not replace, the source.

Do not autonomously send replies.

Do not implement Gmail during the initial foundation unless explicitly requested.

---

## 28. Fast capture and progressive disclosure

Become will fail if logging becomes annoying.

Prioritize very low-friction capture for:

- timer start/stop
- income
- expense
- idea
- company interaction
- follow-up
- decision
- quick notes

Avoid giant mandatory forms.

Require the minimum now and allow enrichment later.

The application may become powerful, but the UI should not expose all complexity at once.

Dashboard shows high-level truth.

Dedicated pages provide depth.

---

## 29. Navigation

Possible top-level structure:

- Home
- Engineering
- Entrepreneurship
- Finance
- Content
- Goals
- Experiments
- Ideas
- Decisions
- Reviews

Settings may include:

- Domains
- Activities
- Dashboard
- Financial Accounts
- Integrations
- AI
- Appearance

Do not put every database entity in the sidebar.

Eventually consider a command palette for actions such as:

- Start timer
- Add expense
- Record income
- Add idea
- Add company
- Record decision
- Search projects/companies
- Open current season

---

## 30. Responsive design and accessibility

Desktop is the primary initial environment, but Become must be responsive because fast capture is naturally useful on mobile.

Do not build native apps initially.

Maintain semantic HTML, keyboard navigation, visible focus, sufficient contrast, accessible labels/dialogs/dropdowns, and touch-friendly controls.

Do not use color as the only signal.

---

## 31. Analytics implementation

Important calculations should live in deterministic, reusable, testable functions/services.

Examples:

- getSeasonForDate()
- getSessionsForPeriod()
- calculatePeriodDuration()
- calculatePeriodComparison()
- calculateEffectiveHourlyRate()
- calculateSavingsChange()
- calculateReplyRate()
- calculateConversionRate()
- calculateGoalProgress()
- calculateIncomeDevelopmentReturn()

Use PostgreSQL properly for filtering, grouping, aggregation, joins, and indexing.

Do not load huge datasets into JavaScript unnecessarily.

Do not prematurely optimize.

---

## 32. State management

Do not install Redux, Zustand, or TanStack Query by default.

Start with:

- Server Components
- Server Actions
- Route Handlers
- URL state
- local component state

If genuinely complex client-side server state appears later, evaluate TanStack Query.

If genuinely complex global client state appears, choose a suitable state manager then.

Dependencies should be earned by requirements.

---

## 33. Code quality

Use strong, intention-revealing names.

Bad:

- handleThing()
- processData()
- updateStuff()

Better:

- startSession()
- completeSession()
- getActiveSession()
- getEngineeringSummary()
- recordIncome()
- transferFunds()
- calculateEffectiveHourlyRate()
- getSeasonForDate()

Keep domain/business logic outside React components.

Avoid giant files and god services.

Avoid meaningless wrappers and speculative abstractions.

Comments should explain why, not narrate obvious syntax.

When major architecture choices are not dictated by this specification, explain the requirement, reasonable options, chosen solution, and important tradeoffs.

Do not repeatedly ask permission for trivial implementation details. Use professional judgment.

---

## 34. Initial development phases

Do not implement everything at once.

### Phase 1: Foundation

Create the application from the empty directory.

Establish:

- Next.js + TypeScript + pnpm
- Tailwind + shadcn
- PostgreSQL + Prisma
- Better Auth
- Zod
- Vitest
- Playwright
- linting/formatting
- environment configuration
- README
- `.env.example`

Create the visual foundation:

- Become dark palette
- Geist typography
- layout shell
- navigation
- responsive structure
- reusable primitives where actual repetition exists

Create only the core models needed:

- User
- Domain
- ActivityType
- Session

Seed:

- Engineering
- Entrepreneurship
- Finance
- Content

with sensible activity types.

Build:

- Home dashboard
- global timer
- active timer recovery after refresh
- start/stop session
- session history
- current fixed season
- Week / Month / Season / Year timeframe primitive
- basic time aggregation
- basic comparisons where sensible

Do not automatically continue to Phase 2.

### Phase 2: Engineering

Add engineering projects with required project context, reusable technology stacks, protected create/edit forms, optionally project-linked sessions, independent session context, activity and context breakdowns, history, output/learning records where useful, and engineering analytics.

### Phase 3: Finance

Add FinancialAccount, Transaction, transfer handling, manual income/expense entry, account/savings views, paid-work metadata, IncomeOpportunity, work/payment linkage, expected/confirmed income, and effective-hourly-rate analytics.

Start with manual financial entry. Do not build bank integration yet.

### Phase 4: Entrepreneurship

Add Niches, Companies, CRM stages, observations, hypotheses, conversations, problems, offers, follow-ups, and entrepreneurship analytics.

### Phase 5: Goals and Experiments

Add generic Goal and Experiment systems with calculated progress/metrics.

### Phase 6: Content, Ideas and Decisions

Build the Content creator workspace, global Ideas, sparse Decision Journal, related Sessions, explicit multi-channel publications and honest manual analytics. See sections 19–21 and `docs/decisions/PHASE_6.md` for the approved scope and implementation status.

### Phase 7: Reviews

Add deterministic weekly/monthly/seasonal/yearly reviews with qualified facts, historical intentions, optional user writing, inspectable sources, immutable editions and explicit amendments. Connect a participating prior Season's progressive finale to the existing opening while preserving first-time and active-work exceptions, deferral, skip, recovery and replay. Prepare bounded period facts, current context, typed retrieval and versioned COTS persona inputs. No AI calls, persona research or generated farewells belong to Phase 7. See `docs/decisions/PHASE_7.md`.

### Phase 8: AI Analyst

Add evidence-backed conversational querying and commentary over structured Become data. One source-grounded COTS persona profile supplies communication tendencies, temperament, values, support/challenge, behavior and anti-caricature boundaries with provenance across Home, reviews, domains, farewell and chatbot. The user's admired/rejected traits, Season standards and adaptation constrain that authentic profile; they do not replace it. No generic Direct/Harsh/Ruthless mode. Personality never changes facts, certainty, qualification or safety. Generated character-inspired farewells bind to saved review/context and persona versions and replay saved output; they remain distinct from verified quotes. Phase 8 owns research/generation, AI-message persistence and orchestration.

### Phase 9: Integrations

Only after the core product proves itself, consider Gmail, Google Pub/Sub, AI company research, outreach drafting, GitHub integration, CSV finance import, bank synchronization, and other integrations.

---

## 35. Phase 1 acceptance criteria

Phase 1 ends with a real usable product.

At minimum the user can:

1. run Become locally
2. authenticate
3. see the Become interface
4. see initial domains
5. start a timer
6. select a domain
7. select an activity
8. stop the timer
9. optionally record description/outcome
10. see saved session history
11. refresh during an active timer without losing it
12. view accumulated time
13. switch Week / Month / Season / Year
14. see the current fixed calendar season
15. use the app on desktop and a mobile-sized viewport
16. see the Become design identity consistently applied

Important calculations must have tests.

Playwright should cover the critical timer journey.

---

## 36. After Phase 1

Stop.

Do not automatically implement Phase 2.

Provide a concise engineering handoff:

- what was built
- architecture
- database models and relationships
- important files/modules
- important business rules
- testing
- design-system implementation
- real technical debt/known compromises
- next logical phase

---

## Product north star

Whenever a product decision is ambiguous, ask:

> Does this help the user understand the relationship between their intentions, behavior, time, outcomes, money, learning, and direction?

If not, question whether the feature belongs.

## Design north star

Choose:

- calm over loud
- clear over decorative
- premium over flashy
- evidence over gamification
- whitespace over unnecessary containers
- typography over endless cards
- subtle motion over spectacle

## Engineering north star

Choose:

> robust enough for the real requirement, but no more complicated than necessary.

Do not sacrifice good architecture merely because another stack is more familiar.

Do not add complexity merely because it looks sophisticated.

---

# FINAL PRINCIPLE

Become is not an application for maximizing activity.

It is an application for understanding **direction**.

Every timer, chart, transaction, company, project, goal, experiment, decision, review, and AI analysis should ultimately provide better evidence for one question:

# Who am I becoming?

Build accordingly.
