# Become Phase 3: Finance

This is the historical Phase 3 Finance plan, not an active agent instruction or design authority. The current product owner's request, root `AGENTS.md`, approved shared library, and implemented Finance contracts govern new work. The implementation and tests determine which planned behaviors actually shipped.

---

# 1. Product principles

Become is not accounting software, a budgeting app, a banking app, or a generic finance dashboard.

Finance exists to help the user understand:

1. What money exists?
2. Where is it held?
3. What money came in and went out?
4. What part of income came from actual paid work?
5. How much time was spent earning money versus trying to create future income?
6. What savings are protected?
7. What savings are intentionally allocated toward goals?
8. What recurring commitments are approaching?
9. Which financial facts still require clarification or user attention?
10. How is the user's financial position changing over Week, Month, Season, and Year?

The central product rule remains:

> **Database = truth. AI = reasoning.**

Phase 3 itself should be deterministic. Do not require AI for financial calculations.

Do not infer historical facts that the database does not contain.

Do not silently transform user intent into facts.

Do not silently "fix" financial data merely because another value changed.

When something becomes inconsistent, surface the inconsistency.

---

# 2. Core semantic boundaries

These distinctions are foundational and must remain visible in the schema, services, analytics, and UX.

## 2.1 Account versus balance

A `FinancialAccount` describes **where money is held**.

It does NOT contain an authoritative mutable current balance.

It also does NOT contain an `openingBalance`.

Balance is derived from:

> latest usable reconciliation snapshot + subsequent transaction flows

The first snapshot serves as the first observed balance anchor.

This is intentional.

Do not reintroduce:

```text
FinancialAccount.currentBalance
FinancialAccount.openingBalance
```

as authoritative financial state.

## 2.2 Snapshot versus flow

A `FinancialAccountBalanceSnapshot` says:

> At this observed/reconciled moment, the account balance was X.

A `FinancialTransaction` says:

> Money moved at this moment.

For account A and instant T:

```text
balanceAt(T)
=
latest snapshot for A with reconciledAt <= T
+
all account effects after that snapshot through T
```

If there is no usable snapshot, the derived balance is **unknown**, not zero.

If a requested aggregate includes an account whose position cannot be established, do not quietly sum only the known accounts and present the result as complete.

## 2.3 Transaction versus recurring expectation

A `RecurringExpense` says:

> This expense is expected/instructed to recur according to this schedule.

A `RecurringExpenseOccurrence` says:

> This particular due date was processed under these snapshotted terms.

A `FinancialTransaction` says:

> Become has recorded that money movement as an actual financial fact.

These are different things.

## 2.4 Work versus payment

A Session proves:

> time was spent doing work.

A financial income transaction proves:

> money was received.

A `PaymentSessionAllocation` proves:

> this amount of this payment was attributed to this work session.

Do not infer one from the other.

A work session may happen weeks before payment.

One payment may cover many sessions.

One session may be paid across multiple payments.

## 2.5 Work source versus opportunity

A `WorkSource` represents an established compensated relationship:

- employer
- client
- platform
- other recurring/ongoing paid source

An `IncomeOpportunity` represents a prospective opportunity:

- job
- gig
- client lead
- platform application
- assessment
- potential paid project

Acceptance of an opportunity does **not** automatically create a WorkSource.

## 2.6 Savings balance versus savings intention

Liquid savings describes **financial reality**.

Protected reserve describes **financial policy**.

Savings goal allocation describes **current user intent**.

Goal spending describes **money that has actually satisfied part of a goal**.

These must not be collapsed into one number.

---

# 3. Money representation

Persist all authoritative money in integer minor units.

Examples:

```text
€19.99 -> 1999
€1,250.00 -> 125000
```

Use PostgreSQL `BIGINT` through Prisma `BigInt`.

Never use JavaScript floating-point arithmetic as the authoritative representation of money.

Client boundaries may serialize monetary values as decimal strings.

Create or reuse a generic money utility layer under an appropriate shared location such as:

```text
src/lib/money/
```

It should own only generic monetary concerns such as:

- validating ISO currency codes
- parsing user-entered decimal strings into minor-unit BigInt
- formatting minor units for display
- obtaining currency minor-unit exponent
- integer-safe allocation helpers
- per-currency aggregation primitives
- bounded display conversion where charts truly require numbers

It must NOT own Finance-specific concepts such as:

- savings goals
- work sources
- opportunities
- recurring bills
- account balances
- effective hourly rates

Parsing must be string-based rather than:

```ts
Math.round(parseFloat(input) * 100)
```

Support currencies with 0, 2, or 3 minor decimal places where practical.

Reject ambiguous or invalid precision instead of silently rounding user input.

Never combine different currencies into one total without explicit FX infrastructure.

FX is deferred.

---

# 4. Time semantics

Application timezone:

```text
Europe/Amsterdam
```

Canonical timestamps remain UTC.

Date-based financial concepts such as recurring due dates use local calendar dates.

Existing Week/Month/Season/Year infrastructure should be reused.

Fixed seasons remain:

```text
Season 1 = Jan / Feb / Mar
Season 2 = Apr / May / Jun
Season 3 = Jul / Aug / Sep
Season 4 = Oct / Nov / Dec
```

Analytics use local period boundaries converted correctly to UTC.

Respect DST.

Do not reinvent date-period infrastructure inside Finance if the repository already has correct reusable utilities.

---

# 5. FinancialAccount

Recommended shape:

```text
FinancialAccount
- id
- userId
- name
- type
- currency
- includeInLiquidSavings
- archivedAt?
- createdAt
- updatedAt
```

Recommended account types:

```text
CHECKING
SAVINGS
CASH
DIGITAL_WALLET
OTHER
```

Examples:

```text
ING Checking        CHECKING
ING Savings         SAVINGS
PayPal              DIGITAL_WALLET
Cash                CASH
```

Do not introduce investments in Phase 3.

Investment accounts remain deferred until investment functionality exists.

## Rules

- User-owned.
- Currency is explicit and immutable once financial history exists.
- Account currency must be uppercase normalized ISO currency code.
- `includeInLiquidSavings` determines whether the account participates in the conceptual liquid savings pool.
- An account with history should normally be archived, not deleted.
- Archived accounts remain part of historical analytics for periods where appropriate.
- Archived accounts should not appear in normal current transaction selectors.

If an active recurring expense references an account, account archival must require that recurrence to be reassigned, paused, ended, or archived first.

---

# 6. FinancialAccountBalanceSnapshot

Recommended shape:

```text
FinancialAccountBalanceSnapshot
- id
- userId
- accountId
- balanceMinor
- reconciledAt
- notes?
- createdAt
- updatedAt
```

Rules:

- Balance may be negative.
- `(accountId, reconciledAt)` should be unique.
- Ownership must be protected at DB level where practical through composite ownership constraints.
- Snapshot is an observed/reconciled anchor.
- The first snapshot acts as the initial balance anchor.
- No separate opening balance field exists.
- Editing/deleting a snapshot is allowed only as an explicit correction because it can change all later derived balances.

The UI must distinguish:

```text
Reconciled balance
Recorded balance based on reconciliation + transactions
Position unavailable / not reconciled
```

Do not call derived recorded balances "live bank balance."

---

# 7. FinancialTransaction

Recommended shape:

```text
FinancialTransaction
- id
- userId
- type
- amountMinor
- currency
- occurredAt
- accountId
- destinationAccountId?
- inflowKind?
- expenseCategoryId?
- counterparty?
- workSourceId?
- incomeOpportunityId?
- recurringExpenseOccurrenceId?
- notes?
- createdAt
- updatedAt
```

Types:

```text
INCOME
EXPENSE
TRANSFER
```

`amountMinor` is always positive.

Direction comes from transaction type and account role.

## Effects

### Income

```text
accountId += amount
```

### Expense

```text
accountId -= amount
```

### Transfer

```text
accountId            -= amount
destinationAccountId += amount
```

Transfers:

- must be same currency
- source != destination
- both accounts user-owned
- excluded from income totals
- excluded from expense totals
- excluded from net external cash flow
- may be reported separately as internal money moved

Do not create paired transfer transactions in Phase 3.

One transfer row is enough.

---

# 8. Income classification

Recommended inflow classification:

```text
EARNED_WORK
BUSINESS_REVENUE
STUDENT_FINANCE
GIFT
REFUND
REIMBURSEMENT
OTHER
```

Prefer a name such as `FinancialInflowKind` rather than implying every inflow is economically earned income.

Examples:

```text
DUO -> STUDENT_FINANCE
Outlier payment -> EARNED_WORK
Entrepreneurship customer payment -> BUSINESS_REVENUE
Birthday money -> GIFT
Returned purchase -> REFUND
```

Student finance, gifts, refunds, reimbursements, etc. must never distort paid-work effective hourly rate.

---

# 9. Expense categories

Use a lightweight user-owned `ExpenseCategory`.

Recommended:

```text
ExpenseCategory
- id
- userId
- name
- normalizedName
- archivedAt?
- createdAt
- updatedAt
```

No giant pre-seeded budgeting taxonomy.

Support category creation when needed.

Archived categories remain on historical transactions.

---

# 10. WorkSource

Recommended:

```text
WorkSource
- id
- userId
- name
- type
- defaultCompensationType
- notes?
- archivedAt?
- createdAt
- updatedAt
```

Types:

```text
EMPLOYER
CLIENT
PLATFORM
OTHER
```

Compensation types:

```text
HOURLY
FIXED
TASK_BASED
UNKNOWN
```

Examples:

```text
Outlier         PLATFORM
Internship job  EMPLOYER
Client X        CLIENT
```

`defaultCompensationType` is a convenience/default, not historical truth for every Session.

A session should snapshot compensation meaning where required.

---

# 11. IncomeOpportunity

Recommended:

```text
IncomeOpportunity
- id
- userId
- title
- organizationName?
- status
- channel?
- discoveredAt
- appliedAt?
- assessmentAt?
- closedAt?
- resultingWorkSourceId?
- compensationType?
- expectedAmountMinor?
- expectedCurrency?
- notes?
- archivedAt?
- createdAt
- updatedAt
```

Statuses:

```text
DISCOVERED
APPLIED
ASSESSMENT
ACCEPTED
REJECTED
ABANDONED
```

Do NOT add `PAID`.

Payment is represented by actual financial transactions.

Do NOT add `ACTIVE`.

Ongoing paid relationship is represented by WorkSource.

Possible channels:

```text
DIRECT
REFERRAL
JOB_BOARD
MARKETPLACE
OUTREACH
OTHER
```

Milestone timestamps are independently nullable.

Do not force every opportunity through a perfectly linear pipeline.

Expected money is prospective only.

It must never appear in actual income metrics.

If expected amount exists, expected currency must exist, and vice versa.

---

# 12. Accepted opportunity to WorkSource flow

When an opportunity is marked `ACCEPTED`, save that fact first.

Then offer:

```text
Create WorkSource
Link existing WorkSource
Not now
```

Do not silently create one.

## Create

Prefill useful values from the opportunity:

- name
- organization
- compensation type
- related context

User confirms before creation.

Creating the WorkSource and assigning `resultingWorkSourceId` should be atomic.

## Link existing

Validate ownership and assign existing WorkSource atomically.

## Not now

Leave:

```text
resultingWorkSourceId = null
```

That is valid.

Later, an accepted opportunity without a source can appear in Needs Attention or on its detail page.

Multiple accepted opportunities may legitimately result in the same WorkSource.

---

# 13. Finance activity classification on Session

Finance already has these seeded activities from Phase 1:

```text
Paid Work
Opportunity Search
Application
Assessment
Finance Admin
```

Introduce explicit Finance activity semantics rather than relying forever on human-readable slug comparisons.

Recommended enum:

```text
FinanceActivityKind
- PAID_WORK
- OPPORTUNITY_SEARCH
- APPLICATION
- ASSESSMENT
- FINANCE_ADMIN
```

`ActivityType` may store nullable `financeActivityKind`.

`Session` stores a nullable snapshot of that kind.

Why:

```text
ActivityType.financeActivityKind
= current reference meaning

Session.financeActivityKind
= historical meaning when that Session was recorded
```

Backfill only known default Finance activity types deterministically.

Do not guess custom activity meaning.

Existing Finance Sessions referencing known default activity types may be deterministically backfilled.

---

# 14. Finance Session metadata

Recommended nullable Session fields:

```text
financeActivityKind?
workSourceId?
incomeOpportunityId?
financeCompensationType?
paymentAttributionCompleteAt?
```

Rules depend on Finance activity type.

### Paid Work

- WorkSource encouraged but not mandatory.
- Compensation type required or `UNKNOWN`.
- Opportunity optional.
- Payment attribution starts unresolved.

### Opportunity Search

- Opportunity optional.

### Application

- Opportunity strongly encouraged but not mandatory.

### Assessment

- Opportunity strongly encouraged but not mandatory.

### Finance Admin

- No income-development implication.

Session metadata is historical Session truth.

Do not rewrite old Sessions because a WorkSource changes later.

---

# 15. PaymentSessionAllocation

Use a many-to-many monetary allocation model.

Recommended:

```text
PaymentSessionAllocation
- userId
- transactionId
- sessionId
- amountMinor
- createdAt
- updatedAt
```

Composite primary key or equivalent uniqueness:

```text
(transactionId, sessionId)
```

Rules:

- Transaction must be `INCOME`.
- Inflow kind must be `EARNED_WORK`.
- Session must be completed Finance `PAID_WORK`.
- Amount > 0.
- Currency must be compatible with payment semantics.
- Sum of allocations for a payment must not exceed payment amount.
- User ownership must match across all related records.

Supports:

```text
one payment -> many sessions
many payments -> one session
partial payment
unallocated payment remainder
```

Do not invent an `earnedAt` on payment.

Session time says when work happened.

Transaction `occurredAt` says when payment moved.

Allocation connects them.

---

# 16. Payment-first attribution UX

Do NOT ask payment questions when the user stops a Paid Work timer.

Timer stop should remain fast.

The payment workflow begins when actual `EARNED_WORK` income is recorded.

Flow:

```text
Record payment
    ↓
Payment saved
    ↓
Offer: Link this payment to work
    ↓
Suggest unresolved Paid Work Sessions
    ↓
User selects Sessions
    ↓
User confirms allocation amounts
    ↓
Ask one completeness question for selected Sessions
```

Completeness choices:

```text
Yes, these sessions are fully accounted for
No, more payment is still expected
I'm not sure
```

Only the first sets:

```text
paymentAttributionCompleteAt = now
```

for selected Sessions.

Do not automatically infer completeness.

Even when the amount looks exactly correct, Become may suggest but may not silently assert.

---

# 17. Deterministic payment candidate suggestions

Suggestions must be explainable.

Prioritize using facts such as:

1. same WorkSource
2. same opportunity
3. opportunity's resulting WorkSource
4. completed Paid Work
5. unresolved attribution
6. temporal proximity between work and payment
7. stable deterministic tie-breaker

Do not use an opaque AI confidence system.

Display why a session was suggested where helpful.

When allocating one payment across several Sessions, Become may offer a proportional duration-based draft.

Use integer-safe largest-remainder distribution.

The draft is not truth until confirmed.

---

# 18. Payment attribution completeness

`paymentAttributionCompleteAt` means:

> The user has asserted that all confirmed compensation attributable to this Session has now been accounted for, including cases where the final outcome is intentionally zero.

It does NOT mean:

- payment date
- first payment date
- last payment date
- expected payment date

UI wording should be natural:

```text
Fully accounted for
Payment review needed
More payment expected
```

If relevant payment or allocation data changes, completeness may become invalid.

Edits that invalidate a completed attribution must clear the marker atomically unless the user explicitly reconfirms.

---

# 19. FinanceCurrencyPolicy

Savings reserve is a per-user, per-currency policy.

Recommended:

```text
FinanceCurrencyPolicy
- id
- userId
- currency
- protectedReserveMinor?
- createdAt
- updatedAt
```

Constraints:

```text
unique(userId, currency)
protectedReserveMinor >= 0 when non-null
```

Semantics:

```text
null = user has not configured a reserve
0    = user deliberately configured no reserve
```

These states are NOT the same in UI.

Currency is immutable.

A policy row may exist with null reserve to provide a stable lock row for savings mutations.

Do not create a generic arbitrary settings engine.

This is a specific Finance policy.

---

# 20. Protected savings reserve

The reserve is a threshold, not an allocation.

Example:

```text
Liquid savings       €5,700
Protected reserve    €3,000
```

Become conceptually treats the first €3,000 as protected.

Savings goals may only claim capacity above the reserve.

This is decision support, not enforcement.

Become may warn:

```text
This purchase would reduce recorded savings below your €3,000 protected reserve.
```

But it does not forbid the expense.

Do not represent reserve itself as a fake SavingsGoal or allocation record.

---

# 21. SavingsGoal

Recommended shape:

```text
SavingsGoal
- id
- userId
- name
- currency
- targetAmountMinor
- allocatedAmountMinor
- status
- completedAt?
- archivedAt?
- createdAt
- updatedAt
```

Statuses:

```text
ACTIVE
PAUSED
COMPLETED
```

Archival is separate through `archivedAt`.

Rules:

```text
targetAmountMinor > 0
allocatedAmountMinor >= 0
```

Do NOT require:

```text
allocatedAmountMinor <= targetAmountMinor
```

without first evaluating goal-spending semantics described below.

The more meaningful bound is against the **remaining fundable requirement**, not blindly against original target.

Goal semantics now distinguish:

```text
Original target
Confirmed goal spending
Remaining goal cost
Current savings allocation
```

This distinction is essential.

---

# 22. Savings goal spending

A goal target is the total intended amount for the goal.

Example:

```text
Gaming PC target = €2,500
```

If the user buys a €500 PC component and confirms that it counts toward the Gaming PC goal, the stored target does NOT become €2,000.

Instead:

```text
Original target          €2,500
Spent toward goal          €500
Remaining goal amount    €2,000
```

The original target remains historically meaningful.

Formula:

```text
remainingGoalAmount
=
max(targetAmount - qualifyingGoalSpending, 0)
```

A goal may therefore be partly satisfied through actual spending before all spending happens at once.

---

# 23. SavingsGoalExpenseAllocation

Goal-related expense attribution must support partial attribution.

Do not merely add a nullable `savingsGoalId` to FinancialTransaction unless repository inspection proves partial attribution cannot be useful.

Preferred model:

```text
SavingsGoalExpenseAllocation
- userId
- savingsGoalId
- transactionId
- amountMinor
- createdAt
- updatedAt
```

Use an appropriate composite uniqueness rule.

Purpose:

> This amount of this expense counts toward this SavingsGoal.

Examples:

### Entire expense

```text
€500 GPU expense
€500 -> Gaming PC
```

### Partial expense

```text
€700 store purchase
€500 -> Office Setup goal
€200 -> unrelated
```

Rules:

- Transaction must be `EXPENSE`.
- Allocation amount > 0.
- Sum of goal-expense allocations for a transaction <= transaction amount.
- Goal and transaction currency must match.
- Ownership must match.
- Archived historical goals may retain historical expense links.
- Do not let one euro of the expense satisfy multiple goals.

This relationship represents **goal progress**, not savings allocation release.

Those are separate decisions.

---

# 24. Goal progress versus savings allocation

These are independent truths.

For a goal:

```text
Target
Spent toward goal
Remaining target
Allocated savings
Funding gap
```

Example:

```text
Target                €2,500
Spent toward goal       €500
Remaining             €2,000
Allocated             €1,400
Funding gap             €600
```

This is more useful than pretending goal progress is simply:

```text
allocated / target
```

Recommended calculations:

```text
spentTowardGoal
=
sum qualifying SavingsGoalExpenseAllocation

remainingGoalAmount
=
max(target - spentTowardGoal, 0)

fundedForRemaining
=
min(allocatedAmount, remainingGoalAmount)

fundingGap
=
max(remainingGoalAmount - allocatedAmount, 0)

overAllocated
=
max(allocatedAmount - remainingGoalAmount, 0)
```

If allocation exceeds the remaining target, surface it and offer release.

Do not silently release money.

---

# 25. Spending related to a SavingsGoal

When an expense is explicitly related to a goal, ask two conceptually separate questions.

Example:

```text
€500 GPU expense linked to Gaming PC
```

## Question A

```text
Should this €500 count toward the €2,500 Gaming PC goal?
```

If yes, create a goal-expense allocation.

## Question B

```text
Should this purchase also reduce the savings currently allocated to Gaming PC?
```

If yes, reduce the goal's current savings allocation by the confirmed amount.

The amount released from savings allocation does not necessarily need to equal the amount counted toward the goal.

Why?

Because funding source and goal progress are not identical.

Example:

```text
Target                 €2,500
Allocated              €2,500

User receives a gifted €500 component.
```

That component may satisfy €500 of the goal without consuming €500 of currently allocated savings.

Conversely, the user might release savings allocation without recording goal progress in certain correction scenarios.

Do not collapse these actions.

---

# 26. Goal purchase convenience flow

From a goal detail page, offer a convenience action such as:

```text
Record purchase for this goal
```

It may prefill:

```text
goal
amount
currency
```

but still require actual financial account/category/date information as appropriate.

On confirmation, one atomic operation may:

1. create the expense transaction
2. create the goal-expense allocation
3. release some/all savings allocation if user selected that
4. optionally mark goal complete if the goal has been fully satisfied

Do not automatically archive a completed goal.

Do not automatically create an expense merely because a goal is completed.

---

# 27. General savings pool semantics

Savings allocations remain conceptual and per currency.

Do NOT tie each goal to a specific savings account in Phase 3.

Reason:

- accounts answer where money is held
- goals answer why money is being saved
- moving money between accounts should not force goal reallocation
- account-specific envelopes would create unnecessary stale state

For currency C:

```text
L = complete current liquid savings
R = configured protected reserve
A = sum current allocations of non-archived goals

AboveReserve = max(L - R, 0)
PlanBalance  = AboveReserve - A
```

Presentation:

```text
UnallocatedSavings = max(PlanBalance, 0)
PlanUnderfunding    = max(-PlanBalance, 0)

ReserveCovered      = min(max(L, 0), R)
ReserveShortfall    = max(R - max(L, 0), 0)
```

If reserve is not configured, distinguish that UI state.

For allocation-capacity calculations, unconfigured reserve may be treated as zero only if clearly separated from an intentionally configured zero reserve in the presentation.

---

# 28. Unexpected spending and savings allocations

This is a critical rule.

A decrease in liquid savings does NOT automatically identify which goal lost money.

Example:

```text
Liquid savings       €5,500
Reserve              €3,000

PC allocation        €1,500
Car allocation       €1,000

Available goal capacity = €2,500
Current allocations     = €2,500
```

The user unexpectedly spends €700 on an unrelated emergency.

New liquid savings:

```text
€4,800
```

Available above reserve:

```text
€1,800
```

Existing allocations remain:

```text
PC  €1,500
Car €1,000
```

The plan is therefore:

```text
Underfunded by €700
```

Become must NOT arbitrarily:

- reduce PC first
- reduce Car first
- reduce proportionally
- choose by priority
- rewrite allocations

Those would invent intent.

Instead:

```text
Your savings plan is underfunded by €700.
Reduce goal allocations by at least €700.
```

The user decides how their intentions have changed.

---

# 29. Unallocated savings naturally absorbs decreases first

No explicit "unallocated allocation record" is needed.

Suppose:

```text
Savings             €6,000
Reserve             €3,000
PC allocation       €1,200
Car allocation      €1,000

Unallocated          €800
```

Unexpected €500 expense:

```text
Savings             €5,500
Above reserve       €2,500
Allocations         €2,200
Unallocated          €300
```

No user interaction required.

If another €600 is spent:

```text
Savings             €4,900
Above reserve       €1,900
Allocations         €2,200
Underfunded          €300
```

Only then should Become surface rebalancing.

This behavior is derived automatically from the pool math.

Do not ask the user to explicitly choose "unallocated savings" for every normal purchase.

---

# 30. Savings rebalance UX

When:

```text
sum(goal allocations) > available savings above reserve
```

surface a Needs Attention item.

Example:

```text
Your available goal funding decreased by €500.

Current allocations:
Gaming PC      €1,500
Car            €2,000

Available for goals:
€3,000

Reduce allocations by at least:
€500
```

The user may edit several goals before confirming.

The mutation should validate the whole final allocation set atomically.

Do not require them to repair one goal at a time if a batch adjustment provides a cleaner experience.

Do not silently rewrite the plan.

---

# 31. Savings allocation mutation integrity

Allocation increases require:

1. user/currency scope
2. complete current liquid position
3. current reserve
4. current non-archived goal allocations
5. available above-reserve capacity

Use a database concurrency strategy that prevents two simultaneous allocation increases from consuming the same conceptual remaining capacity.

A per-user/per-currency policy row is a reasonable lock target.

Inside the transaction:

```text
lock policy row
recalculate financial position
recalculate allocations
validate requested change
write mutation
```

Always allow allocation reductions.

Reserve increases are allowed even if they create underfunding.

Balance drops are allowed even if they create underfunding.

Account archival may create underfunding.

These conditions should surface state, not trigger silent reallocations.

---

# 32. Goal lifecycle

Recommended behavior:

### ACTIVE

Normal savings target.

### PAUSED

Goal temporarily not being actively pursued.

Existing allocation remains reserved unless user releases it.

### COMPLETED

User confirms goal objective has been fulfilled.

Completion should not be inferred solely from:

```text
allocated == target
```

because allocation is not spending.

A goal may be completed when confirmed goal spending satisfies the target, or via explicit user completion where appropriate.

Existing leftover allocation remains until explicitly released.

### ARCHIVED

Historical/non-current goal.

Archiving with non-zero allocation requires explicit release.

Suggested combined action:

```text
Release €X and archive
```

Never silently release allocation.

Completed goals should remain visible historically.

Reopening a completed goal may be supported if it has clear semantics.

---

# 33. RecurringExpense

Recommended shape:

```text
RecurringExpense
- id
- userId
- name
- amountMinor
- currency
- accountId
- expenseCategoryId?
- frequency
- dayOfWeek?
- dayOfMonth?
- monthOfYear?
- startOn
- endOn?
- status
- postingBehavior
- processedThroughOn
- pausedOn?
- archivedAt?
- createdAt
- updatedAt
```

Frequencies:

```text
WEEKLY
MONTHLY
YEARLY
```

Posting behaviors:

```text
ASK_TO_CONFIRM
AUTOMATIC
```

Statuses may be:

```text
ACTIVE
PAUSED
```

with end/archive represented separately.

Do not build a generic cron expression system.

---

# 34. Recurring schedule shape

### Weekly

Requires:

```text
dayOfWeek
```

### Monthly

Requires:

```text
dayOfMonth
```

### Yearly

Requires:

```text
monthOfYear
dayOfMonth
```

Irrelevant schedule fields should be null.

`endOn >= startOn`.

Calendar semantics use local dates.

---

# 35. Recurring month-end behavior

Monthly anchors 29, 30, and 31 clamp to the last valid day of shorter months.

Example:

```text
Anchor: 31

Jan 31
Feb 28
Mar 31
Apr 30
May 31
```

The stored anchor remains 31.

Do not mutate it to 28 after February.

Yearly February 29 recurrences clamp to February 28 in non-leap years, returning to February 29 in leap years.

Weekly recurrence follows local weekday.

---

# 36. RecurringExpenseOccurrence

Recommended:

```text
RecurringExpenseOccurrence
- id
- userId
- recurringExpenseId
- dueOn
- nameSnapshot
- scheduledAmountMinor
- currency
- accountId
- expenseCategoryId?
- postingBehaviorSnapshot
- status
- resolvedAt?
- createdAt
- updatedAt
```

Statuses:

```text
AWAITING_CONFIRMATION
POSTED_AUTOMATICALLY
POSTED_CONFIRMED
SKIPPED
```

Unique:

```text
(recurringExpenseId, dueOn)
```

`FinancialTransaction.recurringExpenseOccurrenceId` should be unique.

Snapshot fields preserve the exact definition used for this occurrence.

Existing occurrences are historical facts about the schedule processing and should not be rewritten by later definition changes.

---

# 37. Ask-to-confirm recurrence

When a due date is processed:

1. materialize occurrence snapshot
2. set `AWAITING_CONFIRMATION`
3. surface it in Needs Attention

User can:

```text
Confirm
Adjust and confirm
Skip
```

Confirm:

- creates one EXPENSE transaction
- status -> POSTED_CONFIRMED

Adjust:

- transaction may use adjusted amount/date/account/category as allowed
- occurrence retains scheduled snapshot
- UI can derive that actual differs from expected

Skip:

- no transaction
- status -> SKIPPED

---

# 38. Automatic recurrence

When due date is processed:

1. create occurrence snapshot
2. create corresponding EXPENSE transaction
3. mark occurrence POSTED_AUTOMATICALLY

All atomically.

UX must state clearly:

> Automatic posting means Become assumes the expense occurred as scheduled. It does not verify your bank account.

This is an explicit user-authorized assumption.

Variable or uncertain bills should usually use ASK_TO_CONFIRM.

---

# 39. Recurring idempotency

Automatic financial posting must never duplicate due to:

- route refresh
- two tabs
- retries
- concurrency
- server restart
- repeated catch-up invocation

Use both:

```text
unique(recurringExpenseId, dueOn)
unique(financialTransaction.recurringExpenseOccurrenceId)
```

plus idempotent service behavior.

Unique constraints are the final safety net.

Concurrent processors should converge to one occurrence/transaction.

---

# 40. Catch-up processing

Do not assume the Next.js process is an exact scheduler.

Use one shared idempotent processing service.

It may run:

- after entering Finance
- before recurrence mutations
- from an explicit "Check due expenses" action
- later from optional deployment scheduler infrastructure

Do not mutate financial state from a GET route render.

Use an authenticated mutation boundary such as a Server Action or POST.

Algorithm:

1. calculate current Europe/Amsterdam local date
2. find definitions behind `processedThroughOn`
3. enumerate due dates in bounded batches
4. materialize confirmation occurrences
5. materialize automatic occurrence + transaction atomically
6. advance processed cursor
7. return results
8. refresh affected UI

If app was unused for several days, the next Finance visit catches up missed eligible dates.

Transactions should use due-date semantics, not catch-up execution time.

---

# 41. Same-day recurring definition edits

This rule overrides any older "always process old version first" rule.

Past dates, today, and future are treated differently.

## Past due dates

Already-due dates before today are processed using the old definition before the change.

Historical obligations should not be retroactively rewritten.

## Future dates

Future unprocessed dates use the new definition.

## Today

Today is special.

If today's occurrence has already been materialized:

- do not rewrite it through definition editing
- user edits/corrects that occurrence/transaction separately

If today is due **and today's occurrence has not yet been materialized**, the edit UX must ask:

```text
This expense is due today.

Apply these changes:

○ Starting today
○ Starting next occurrence
```

### Starting today

Today's occurrence uses the new definition.

### Starting next occurrence

Today's occurrence uses the old definition.

Future occurrences use the new definition.

Do not make this depend accidentally on whether the database row happened to be read before or after another write.

This is a user-facing semantic decision.

---

# 42. Recurring pause/resume/end/archive

Pause:

- no occurrences should later be generated for dates inside the paused interval

Resume:

- continue from resumed eligibility
- do not backfill paused dates

End:

- no due dates after `endOn`

Archive:

- preserve definition and all historical occurrences/transactions
- no future processing

The exact representation of paused interval state should be designed carefully enough to support these semantics without guessing.

If a single `pausedOn` field is insufficient to implement reliable resume semantics, improve the schema rather than pretending it is enough.

Avoid a generic recurrence-history/event-sourcing subsystem unless required.

---

# 43. Recurring correction behavior

Editing generated transaction:

- occurrence remains posted
- actual-vs-scheduled difference is derived

Deleting generated transaction:

- occurrence reopens to `AWAITING_CONFIRMATION`
- do NOT immediately auto-post it again, even if original behavior was AUTOMATIC

This prevents correction loops.

If expense did not occur:

```text
Mark skipped
```

is the preferred state.

Definition edits never rewrite existing occurrences or transactions.

---

# 44. Recurring analytics

Per currency, support:

- active recurring commitments
- awaiting confirmations
- automatic definitions
- paused definitions
- next upcoming expenses
- exact scheduled total next 30 days
- exact scheduled total next 12 months
- commitments by category
- largest recurring commitments
- recently posted recurring expenses
- recurring versus non-recurring actual expense share

Annual normalization:

```text
weekly  -> amount * 52
monthly -> amount * 12
yearly  -> amount
```

Monthly equivalent:

```text
annualized / 12
```

Mark approximations appropriately.

For exact windows, enumerate the actual calendar schedule rather than pretending all years contain exactly 52 weekly occurrences.

A 12-month window may contain 52 or 53 weekly due dates.

Finite recurrences should emphasize exact remaining obligations rather than misleading indefinite annualized metrics.

Do not implement generalized cash-flow forecasting.

Known scheduled commitments are in scope.

Forecasting is not.

---

# 45. Savings analytics

Per currency:

- current liquid savings
- position completeness/freshness
- protected reserve
- reserve covered
- reserve shortfall
- amount above reserve
- total goal allocations
- unallocated savings
- savings plan underfunding
- active goals
- goal original target
- goal confirmed spending
- remaining goal amount
- current allocation
- funding gap
- over-allocation if any
- current savings versus previous period where position can be truthfully derived

Do not claim historical allocation changes because Phase 3 does not require a savings allocation history table.

If current position is incomplete:

- show known goal targets
- show stored allocations
- mark capacity-derived metrics unavailable
- disable allocation increases
- do not pretend partial liquid-savings sums are complete

---

# 46. Cash-flow analytics

For selected period `[start, end)`:

Per currency:

- total received inflow
- earned-work payments received
- business revenue
- other inflows
- expenses paid
- net external cash flow
- transfers moved
- income by inflow classification
- earned-work receipts by WorkSource including Unassigned
- expenses by category including Uncategorized
- recurring versus non-recurring actual expenses

Definitions:

```text
received inflow = sum(INCOME)
expense = sum(EXPENSE)
net external cash flow = inflow - expense
```

Transfers excluded.

Refunds/reimbursements are inflows.

Do not automatically retroactively reduce gross category expenses with refunds in Phase 3.

---

# 47. Work analytics

Finance Session time should use existing overlap-clipping semantics.

Support:

```text
Paid Work time
Opportunity Search time
Application time
Assessment time
Finance Admin time
Income Development time
```

Income Development:

```text
Opportunity Search
+ Application
+ Assessment
```

Do not include Finance Admin.

Running sessions may contribute clipped current time where existing analytics conventions allow, but effective rate eligibility should remain conservative.

---

# 48. Linked effective hourly rate

Rate analytics must be based only on confirmed payment allocations.

For completed Paid Work session:

```text
session full duration = D
period overlap = d
allocation amount = a
```

Period-attributed amount:

```text
a * d / D
```

Use exact rational/integer-safe arithmetic and round only at display boundary.

Effective rate:

```text
sum(period-attributed confirmed payment)
* 3600
/
sum(overlapping completed paid-work seconds)
```

Availability states should be explicit.

Suggested typed states:

```text
NO_PAID_WORK
INCOMPLETE_ATTRIBUTION
NO_LINKED_INCOME
MIXED_CURRENCY
AVAILABLE
```

Do not show fake €0/h when the answer is actually unknown.

Payment timing and work timing remain independent:

- payment outside selected period may still fund work inside selected period for rate analytics
- payment inside selected period with work outside contributes cash inflow but not selected-period work rate

Mixed currencies must not produce a blended rate.

---

# 49. Opportunity analytics

Support deterministic metrics such as:

- discovered
- applications
- assessments
- accepted
- rejected
- abandoned
- acquisition time
- conversion to first actual paid income where explicitly linked
- confirmed revenue by opportunity where explicitly linked
- confirmed revenue by channel where explicit relationship exists

Cohort conversion should be defined carefully.

For example:

> opportunities discovered during selected period, converted by period end/current now

Avoid misleading previous-period percentage badges where cohort maturity differs dramatically.

Do not attribute all WorkSource revenue to every opportunity that ever resulted in that source.

Opportunity revenue requires explicit linkage.

---

# 50. Acquisition-adjusted return

If implemented in Phase 3, keep it narrow and truthful.

For one opportunity:

```text
confirmed allocated income
/
(paid-work time + acquisition time)
```

only if:

- relevant paid sessions are attribution-complete
- currency is singular
- denominator > 0
- relationships are explicit

Do not create a fake global "ROI" metric by mixing unrelated sources/opportunities.

---

# 51. Needs Attention model

Finance attention data must retain its deterministic urgency and source qualification.

Possible attention items:

- account position unavailable or stale
- reserve shortfall
- savings plan underfunded
- goal over-allocated relative to remaining need
- recurring expense awaiting confirmation
- recurring processing failure
- earned-work payment has unallocated remainder
- completed Paid Work Session has no allocation
- Paid Work Session has partial allocation but incomplete review
- payment attribution was invalidated by correction
- accepted opportunity still has no WorkSource

Rank deterministically.

Do not use AI to decide urgency.

---

# 52. Finance routes

Recommended:

```text
/finance
/finance/transactions
/finance/accounts
/finance/savings
/finance/recurring
/finance/opportunities
/settings
/settings/finance
```

Existing generic `/domains/finance` should redirect to dedicated Finance experience while preserving relevant query state where appropriate.

---

# 53. Finance overview facts

Supply current recorded position by currency, reconciliation freshness/completeness, deterministic actionable obligations, savings, recurring commitments, separately qualified inflow/outflow/transfers, and work/income development.

---

# 54. Savings page

The Savings page should answer:

```text
How much liquid savings exists?
How much must remain protected?
How much is available above reserve?
What goals currently claim that money?
How much has actually been spent toward each goal?
How much remains to fund?
Is my savings plan internally supportable?
```

Do not call `allocated / target` "goal progress" once spending exists.

Use truthful labels.

Goal progress has at least two dimensions:

```text
purchase completion
funding readiness
```

---

# 55. Recurring page

Should support:

- active recurring expenses
- upcoming dates
- awaiting confirmation
- automatic/manual behavior
- paused/end/archive
- creation/editing
- recent posting history
- schedule details
- category/account
- next due date


---

# 56. Transactions page

Needs a complete ledger with cursor pagination.

Do not use the generic history `take: 100` approach as the permanent Finance ledger.

Use deterministic cursor ordering such as:

```text
occurredAt DESC
id DESC
```

Filters should be URL-backed where appropriate.

Potential filters:

- period
- type
- account
- category
- WorkSource
- opportunity
- recurring
- currency

Do not overload the first implementation with every conceivable filter if the product remains usable without them.

---

# 57. Accounts page

Support:

- account list
- current recorded position
- reconciliation freshness
- include/exclude from liquid savings
- archive
- reconciliation history
- add reconciliation snapshot

Account creation should naturally request an initial reconciliation instead of an `openingBalance`.

An atomic UX may create:

```text
FinancialAccount
+
first FinancialAccountBalanceSnapshot
```

when initial balance is supplied.

That preserves one balance architecture.

---

# 58. Settings architecture

Settings is a coherent application area, not a Finance-specific random page.

Routes:

```text
/settings
/settings/finance
```

While Finance is the only real Settings section:

```text
/settings -> redirect /settings/finance
```

Do not render fake future sections such as:

```text
General
Security
Notifications
Engineering
Entrepreneurship
```

until they exist.

---

# 59. Finance Settings scope

Finance Settings currently contains at minimum:

```text
Savings policy
- protected reserve per currency
```

Only add other settings if truly implemented and justified.

Savings goals themselves are NOT settings.

Recurring expense definitions are NOT settings.

---

# 60. Transaction and savings interaction

Most expenses are unrelated to goal semantics.

If an expense reduces liquid savings capacity, derived pool math handles the consequence.

If the plan remains funded:

```text
do nothing
```

If the plan becomes underfunded:

```text
surface rebalancing
```

No goal deduction is guessed.

---

# 61. Optional goal impact on expense

Optional expense-to-goal attribution supports:

- choose goal
- choose amount of expense that counts toward goal
- optionally choose how much current goal allocation to release

Savings allocation is conceptual; expense attribution does not trace physical money from a particular account allocation.

---

# 62. Mutation semantics for goal expenses

For a single goal-related purchase, an atomic write may include:

```text
FinancialTransaction
SavingsGoalExpenseAllocation
SavingsGoal allocatedAmount change
SavingsGoal completion change
```

Only perform mutations the user actually confirmed.

If one part fails, rollback the entire operation.

Editing/deleting the expense must validate linked goal allocations.

Deleting an expense must not leave phantom goal spending.

If deleting/correcting the transaction invalidates goal completion or over-allocation state, surface/resolve that deterministically.

Do not silently rewrite unrelated goal allocations.

---

# 63. Savings target edits

If target increases:

- remaining need increases accordingly
- existing spending remains
- existing savings allocation remains
- funding gap may increase

If target decreases below already-confirmed goal spending:

Do not blindly allow a nonsensical state.

Require explicit correction or confirmation depending on intended semantics.

For example, if:

```text
Target €2,500
Already spent toward goal €2,300
```

changing target to €2,000 needs a clear rule because the goal has already exceeded the new target.

If target falls below current savings allocation for remaining need:

- do not silently release allocation
- surface over-allocation and offer release

---

# 64. Position and savings history

Balance-at-instant queries should use the latest reconciliation anchor at or before the instant plus later transaction effects.

Savings change for a period:

```text
positionAt(end)
-
positionAt(start)
```

only when both positions can be established truthfully.

If not enough reconciliation history exists, return unavailable rather than fabricate.

Current recorded savings may still be available even when historical savings change is unavailable.

These states should be distinct.

---

# 65. Archive semantics

## Account

Hard delete only when truly unreferenced.

Otherwise archive.

## WorkSource

Hard delete only if unreferenced.

Otherwise archive.

## IncomeOpportunity

Hard delete only if unlinked and safe.

Otherwise archive/abandon.

## SavingsGoal

Archive preserves historical goal/spending relationships.

Non-zero allocation must be explicitly released.

## RecurringExpense

Archive preserves occurrences and generated transactions.

No future processing.

## ExpenseCategory

Archive preserves historical use.

---

# 66. Ownership integrity

Use the existing Phase 2 ownership pattern.

Where practical, parent tables should expose:

```text
unique(id, userId)
```

and child relations should use composite foreign keys that include user ownership.

Goal:

> It should be impossible to create a cross-user relationship even if a service bug occurs.

Apply this principle to:

- account snapshots
- transaction accounts
- destination account
- expense categories
- recurring definitions
- recurring occurrences
- WorkSource
- opportunity
- Session links
- payment allocations
- savings goals
- goal-expense allocations
- currency policies

Do not rely purely on UI filtering.

---

# 67. Service-level integrity

Database constraints handle same-row truths.

Services handle cross-row/business truths.

Examples requiring service validation:

- transfer currencies match
- account is active/selectable
- recurring category/account ownership
- allocation sums do not exceed payment
- goal-expense allocations do not exceed expense
- goal currency matches expense
- savings allocation increase fits current capacity
- Paid Work Session is eligible
- payment is EARNED_WORK
- WorkSource/opportunity relationships make sense
- recurring definition edits handle due dates correctly
- active recurring definition blocks account archive

Do not attempt to express every business rule as a giant SQL CHECK.

---

# 68. Atomic operations

Use DB transactions for compound writes such as:

- account + first reconciliation
- transfer validation/write where needed
- payment + allocation set
- replacing payment allocations
- completeness confirmation
- accepted opportunity + create/link WorkSource
- savings allocation batch rebalance
- goal purchase transaction + goal spending + allocation release
- recurring occurrence + automatic transaction
- recurring confirmation + transaction
- transaction deletion + recurring occurrence reopening
- correction flows that invalidate attribution/completion

No network calls inside DB transactions.

Use ordinary PostgreSQL isolation unless a specific race proves stronger isolation is necessary.

Do not use Serializable everywhere as cargo cult.

---

# 69. Concurrency

Explicitly test two high-risk races.

## Savings allocation race

Two requests simultaneously try to allocate the final available €500 to different goals.

Only one combined state may succeed if both would over-allocate.

Use lock/recheck/write semantics.

## Recurring processing race

Two requests process the same due definition simultaneously.

At most one occurrence and one transaction may exist.

Database uniqueness plus idempotent handling must guarantee this.

Payment allocation totals should also be protected against concurrent over-allocation.

Choose an appropriate transaction/locking strategy based on actual Prisma/PostgreSQL capabilities in the repository.

---

# 70. Session editing boundaries

Phase 3 does NOT introduce generic historical Session editing.

Allow narrowly scoped Finance metadata correction for completed Finance Sessions where justified:

- WorkSource
- opportunity
- compensation type
- attribution completeness

Do not casually add:

- timestamp editing
- domain editing
- arbitrary activity rewrites
- notes/outcome editing

unless already supported elsewhere.

Keep scope restrained.

---

# 71. Timer integration

The current timer controller is reportedly large.

Do not shove every Finance-specific selector and rule into one increasingly monolithic component.

Use Phase 3 as an opportunity to extract domain-specific timer sections according to existing architecture conventions.

Finance timer behavior:

### Paid Work

Optional WorkSource
Optional opportunity
Compensation type

### Opportunity Search/Application/Assessment

Optional or encouraged opportunity linkage depending on activity.

### Finance Admin

No unnecessary income-development fields.

---

# 72. Repository architecture

The following structure describes the original Phase 3 implementation plan.

Do not create empty folders for hypothetical future code.

Likely shape:

```text
src/features/finance/
├── accounts/
│   ├── actions/
│   ├── components/
│   ├── queries/
│   ├── schemas/
│   ├── services/
│   └── types/
├── analytics/
│   ├── components/
│   ├── queries/
│   ├── services/
│   ├── types/
│   └── utils/
├── categories/
├── opportunities/
│   ├── actions/
│   ├── components/
│   ├── queries/
│   ├── schemas/
│   └── services/
├── payments/
│   ├── actions/
│   ├── components/
│   ├── queries/
│   ├── schemas/
│   └── services/
├── recurring/
│   ├── actions/
│   ├── components/
│   ├── constants/
│   ├── queries/
│   ├── schemas/
│   ├── services/
│   ├── types/
│   └── utils/
├── savings/
│   ├── actions/
│   ├── components/
│   ├── queries/
│   ├── schemas/
│   ├── services/
│   ├── types/
│   └── utils/
├── settings/
│   ├── actions/
│   ├── components/
│   ├── schemas/
│   └── services/
├── transactions/
│   ├── actions/
│   ├── components/
│   ├── queries/
│   ├── schemas/
│   └── services/
└── work-sources/
    ├── actions/
    ├── components/
    ├── queries/
    ├── schemas/
    └── services/
```

Only create folders/files as their slice is actually implemented.

Application-wide Settings navigation may belong under:

```text
src/features/settings/
```

if it is genuinely application-wide.

Do not put reusable global Settings shell logic inside Finance merely because Finance is the first consumer.

---

# 73. Naming conventions

The original plan expected these authored suffixes:

```text
*.component.tsx
*.service.ts
*.query.ts
*.action.ts
*.middleware.ts
*.schema.ts
*.util.ts
*.hook.ts
*.types.ts
*.constants.ts
*.config.ts
*.mapper.ts
*.adapter.ts
*.test.ts
*.test.tsx
*.spec.ts
```

Framework-reserved filenames remain exceptions:

```text
page.tsx
layout.tsx
route.ts
loading.tsx
error.tsx
not-found.tsx
middleware.ts
schema.prisma
```

Do not rename generated/framework-managed files just to satisfy suffix preferences.

---

# 74. Styling

Tailwind remains default.

Use shared product-wide tokens for recurring design decisions.

Use feature-colocated CSS only when Tailwind is insufficient or custom feature behavior genuinely benefits from it.

Do not dump Finance CSS into `globals.css`.

Use tabular numerals for financial values.

Do not rely on color alone for positive/negative/state meaning.

---

# 75. Forms and dirty-state protection

Substantial create/edit forms should use the existing unsaved-changes conventions where appropriate.

Do not block deliberate logout if current application behavior deliberately excludes it.

Mutation UX should preserve user data on validation errors.

Money inputs should accept human-friendly decimal entry and convert safely at server validation boundary.

---

# 76. Pagination

Finance transaction history must use cursor pagination.

Reconciliation history should support load-more/cursor behavior if it can grow meaningfully.

Do not fetch the user's entire ledger into one Server Component.

Queries should remain ownership-scoped.

---

# 77. Analytics comparison semantics

Support existing:

```text
Week
Month
Season
Year
```

and previous-period comparison.

For prior value zero:

```text
percentage change unavailable
```

Do not show infinity.

Use absolute change where meaningful.

For cohort metrics where previous-period comparisons are inherently misleading, do not force a comparison badge just for consistency.

---

# 78. Error states

Distinguish at least:

```text
No financial accounts
Account exists but unreconciled
Position unavailable
No transactions
No savings goals
Reserve not configured
Savings plan underfunded
No recurring expenses
Recurring confirmation due
No WorkSources
No opportunities
No Paid Work
Payment awaiting allocation
Paid Work awaiting attribution review
Mixed currency rate unavailable
```

Do not collapse everything into "No data."

---

# 79. Phase 3 migrations

Never edit already-applied migrations.

Use additive migrations.

Prefer vertical-slice migrations rather than one enormous speculative schema migration.

Suggested implementation/migration sequence:

1. accounts + balance snapshots
2. transactions + transfers + expense categories
3. Finance Settings currency policy
4. savings goals + goal-expense allocation
5. recurring definitions + occurrences + transaction recurrence relation
6. WorkSources + IncomeOpportunities
7. Finance Session classification + metadata
8. payment attribution

The exact migration boundaries may be adjusted if repository inspection reveals a cleaner dependency order.

Every migration should accompany a runnable product slice.

Do not create the entire Phase 3 schema first and only later start UI.

---

# 80. Backfills

Backfill only deterministic facts.

Allowed:

- known Finance default activity types -> known FinanceActivityKind
- Sessions using those exact known built-ins -> snapshot same kind

Do not backfill:

- WorkSource
- opportunity
- compensation type when unknown
- payment attribution
- savings reserve
- savings goals
- recurring expenses
- goal expense relationships

Absence is preferable to fabricated history.

---

# 81. Account creation slice

First financial vertical slice should support:

```text
create account
provide initial observed balance
create first snapshot atomically
view current recorded position
add reconciliation snapshot
```

This immediately validates the snapshot + flow model.

Do not introduce opening balance merely to simplify the form.

The UI can still call it:

```text
Current balance
```

during setup.

The persistence representation remains a snapshot.

---

# 82. Transactions slice

Then support:

```text
income
expense
transfer
category
account effect
cash-flow analytics
position derivation
```

This validates that:

```text
snapshot + transaction flows
```

actually works before savings depends on it.

Test transfers heavily because they affect account position but must not distort external cash flow.

---

# 83. Settings + reserve slice

Build the real Settings shell before savings allocation behavior depends on reserve configuration.

Implement:

```text
/settings
/settings/finance
```

with responsive access to the implemented configuration.

Finance Settings initially owns:

```text
protected savings reserve per currency
```

No placeholder settings.

---

# 84. Savings slice

Then implement:

- goals
- allocation
- reserve math
- goal spending
- goal-related expense allocation
- funding gaps
- over-allocation
- underfunded savings plan
- rebalancing
- goal lifecycle
- overview summary

This slice should use real account/transaction-derived liquid savings.

Do not build savings against mocked balance concepts.

---

# 85. Recurring slice

Build in two stages:

### Stage A

- schedule calculation utilities
- definition CRUD
- upcoming projections
- pause/end/archive
- calendar edge tests

### Stage B

- occurrences
- catch-up
- ASK_TO_CONFIRM
- AUTOMATIC
- idempotency
- corrections
- recurring analytics

Do not mix scheduler semantics into UI components.

Keep recurrence calendar logic pure/testable where possible.

---

# 86. Work and opportunity slice

Implement:

- WorkSources
- IncomeOpportunities
- accepted continuation flow
- opportunity analytics

Then integrate Finance metadata into Sessions/timer.

This allows timer selectors to use real domain records.

---

# 87. Payment attribution slice

Implement after:

```text
transactions
WorkSources
opportunities
Finance Session metadata
```

exist.

Support:

- EARNED_WORK payment
- candidate sessions
- manual allocation
- proportional draft
- allocation remainder
- completeness confirmation
- invalidation
- effective rate

Do not hide unfinished attribution.

---

# 88. Final overview assembly

Assemble `/finance` only after its core capability slices work.

Overview data must come from implemented systems.

The final overview should compose real query/service results from the completed slices.

---

# 89. Testing: money

Unit test:

- parsing
- formatting
- 0-decimal currencies
- 2-decimal currencies
- 3-decimal currencies
- invalid precision
- BigInt limits
- integer allocation
- largest-remainder splitting

Never rely solely on browser tests for money correctness.

---

# 90. Testing: account balances

Test:

- first snapshot
- transactions after snapshot
- later reconciliation replacing prior derived path
- historical balance before/after snapshots
- negative balance
- missing snapshot = unknown
- transfer source/destination effects
- archived account history
- incomplete liquid-savings aggregate

---

# 91. Testing: savings

Test at minimum:

- reserve not configured
- reserve zero
- below reserve
- exactly reserve
- above reserve
- multiple goals
- unallocated capacity
- capacity fully allocated
- concurrent allocation race
- later balance drop -> underfunding
- reserve increase -> underfunding
- account archive -> underfunding
- unrelated expense consumes unallocated capacity first mathematically
- unrelated expense causes underfunding without changing allocations
- explicit rebalance
- goal-related full expense allocation
- partial transaction allocated to goal
- one expense partly unrelated
- transaction allocation cannot exceed expense
- same expense amount cannot be double-counted across goals
- goal currency mismatch rejected
- goal spending reduces remaining need
- goal spending does not mutate original target
- allocation release independent from goal spending
- target increase
- target reduction below spending
- over-allocation relative to remaining need
- completed goal with leftover allocation
- explicit release
- archive requires allocation release
- purchase workflow atomicity

---

# 92. Testing: recurring

Test:

- weekly
- monthly
- yearly
- 29th
- 30th
- 31st
- February
- leap-year February 29
- DST boundaries
- start in past
- end date
- pause
- resume
- archive
- automatic posting
- confirmation
- adjusted confirmation
- skip
- catch-up after several missed days
- repeated catch-up
- concurrent catch-up
- no duplicate occurrence
- no duplicate transaction
- edit before due date
- edit after historical due dates
- edit on due date: starting today
- edit on due date: starting next occurrence
- existing today's occurrence is not rewritten
- definition edit preserves historical snapshots
- generated transaction edit
- generated transaction delete reopens occurrence
- reopened automatic occurrence does not immediately repost

---

# 93. Testing: opportunity and work

Test:

- create WorkSource
- archive WorkSource
- create opportunity
- accept -> create source
- accept -> link existing
- accept -> not now
- later link
- several opportunities -> one source
- rejected opportunity no source required
- expected income excluded from actual metrics
- Finance activity classification
- historical Session snapshot
- custom unclassified Finance activity remains unknown

---

# 94. Testing: payments

Test:

- one payment -> one Session
- one payment -> many Sessions
- many payments -> one Session
- payment greater than allocated total
- payment exact allocation
- partial payment
- unallocated remainder
- allocation > payment rejected
- wrong inflow type rejected
- non-Paid Work Session rejected
- cross-user relation rejected
- completeness yes
- completeness no
- completeness unsure
- later payment
- allocation edit clears completeness
- payment edit clears/revalidates completeness
- payment deletion
- mixed currencies
- effective-rate availability states
- cross-period work/payment behavior

---

# 95. PostgreSQL integration tests

Use real PostgreSQL integration tests for constraints that mocks cannot prove.

Especially:

- composite ownership foreign keys
- unique recurrence occurrence
- unique recurrence transaction relation
- payment allocation sum concurrency
- savings capacity concurrency
- transfer invariants
- deletion/archive restrictions
- foreign-key historical preservation

Do not assume Prisma type safety replaces database integrity.

---

# 96. Browser coverage

Desktop, tablet, and mobile journeys should include:

- account + initial reconciliation
- later reconciliation
- income
- expense
- transfer
- reserve configuration
- create savings goals
- allocate several goals
- trigger underfunding
- rebalance goals
- record goal-related partial purchase
- goal progress/spending display
- recurring monthly 31st
- recurring automatic posting
- recurring confirmation
- recurring skip
- accepted opportunity create/link/not-now
- Paid Work timer
- payment-first attribution
- unresolved attribution
- Settings responsive behavior
- Finance navigation
- transaction ledger pagination

Accessibility:

- keyboard operability
- proper labels
- dialogs/sheets focus handling
- no meaning through color alone
- readable monetary tables
- responsive overflow handling

---

# 97. Documentation

Update README and relevant docs only when behavior/scripts actually change.

There is an existing documentation mismatch around reference-data sync naming.

Inspect it.

Current intent is that built-in Engineering technology synchronization uses:

```text
pnpm db:sync-tech
```

Do not broadly rename unrelated scripts without need.

Document Finance semantics where future contributors could otherwise make dangerous assumptions, especially:

```text
snapshot + flow balance model
no openingBalance
allocation != spending
recurring expectation != bank truth
work != payment
```

---

# 98. Explicitly deferred from Phase 3

Do NOT build:

- bank integrations
- imported bank feeds
- pending bank transactions
- transaction auto-matching from bank
- FX conversion
- cross-currency transfers
- investments
- liabilities/debt payoff system
- tax/accounting workflows
- invoices
- double-entry bookkeeping
- merchant intelligence
- subscription cancellation
- arbitrary budget envelopes
- generic budgeting system
- generic recurrence DSL
- guaranteed background cron infrastructure
- generalized cash-flow forecasting
- AI financial advisor
- AI transaction categorization
- global arbitrary Session editing
- historical savings-allocation timeline
- account-specific savings envelopes
- generalized rules engine

Do not "future-proof" these by prematurely implementing their infrastructure.

Leave clean extension seams instead.

---

# 99. Product-truth limitations that must remain visible

## Savings allocation

Become knows:

```text
financial position
user-declared reserve
user-declared allocations
user-confirmed goal spending
```

It does not know which physical euro belongs to which goal.

Therefore unrelated balance reduction can create underfunding but cannot truthfully choose a goal to reduce.

## Automatic recurring expenses

Become can record scheduled expenses based on explicit user instruction.

It cannot claim bank verification.

## Account balances

Without a usable reconciliation anchor, position is unknown.

Do not pretend zero.

## Effective rate

Without complete payment attribution, the rate is unavailable.

Do not estimate from expected compensation unless clearly shown as a separate prospective calculation, and prospective rate calculations are not required for Phase 3.

---

# 100. Final Phase 3 implementation order

Use this as the default sequence unless concrete repository dependencies justify a small adjustment:

### Slice 1
Finance shell + shared money/date foundation.

### Slice 2
Financial accounts + first reconciliation + balance derivation.

### Slice 3
Transactions + transfers + categories + cash-flow/position analytics.

### Slice 4
Application Settings shell + FinanceCurrencyPolicy + reserve.

### Slice 5
SavingsGoal + SavingsGoalExpenseAllocation + savings allocation/rebalancing + savings page.

### Slice 6
Recurring schedule engine + definitions + projections.

### Slice 7
Recurring occurrences + catch-up + automatic/confirm processing + recurring analytics.

### Slice 8
WorkSources + IncomeOpportunities.

### Slice 9
Accepted opportunity -> Create / Link / Not now flow.

### Slice 10
Finance activity classification + Finance Session metadata + timer decomposition/integration.

### Slice 11
PaymentSessionAllocation + payment-first attribution + completeness/invalidation + effective rates.

### Slice 12
Unified Finance overview + Needs Attention.

### Slice 13
Responsive refinement + accessibility + complete E2E/integration/concurrency coverage + documentation cleanup.

Each slice must leave the application runnable and reviewable.

Do not create all schema, all routes, and all UI upfront.

---

# 101. Definition of Phase 3 complete

Phase 3 is complete when Become can truthfully and reliably answer:

### Position

```text
What money do I currently have recorded?
Where is it held?
How fresh/complete is that knowledge?
```

### Cash movement

```text
What came in?
What went out?
What was merely transferred?
How did that change over Week/Month/Season/Year?
```

### Savings

```text
How much liquid savings exists?
How much do I want protected?
How much remains above that reserve?
What goals have I allocated savings toward?
How much has actually been spent toward each goal?
How much of each goal remains?
How much is currently funded?
Is the savings plan underfunded?
What must I rebalance?
```

### Recurring commitments

```text
What expenses are expected?
What is coming soon?
Which require confirmation?
Which are automatically recorded?
What was actually posted?
```

### Paid work

```text
How much time did I spend doing paid work?
Which payment belongs to which work?
Which sessions are fully accounted for?
What effective rate is actually supported by confirmed data?
```

### Income development

```text
How much time did I spend searching, applying, and assessing?
Which opportunities converted?
Which WorkSources actually produced confirmed income?
```

### Attention

```text
What financial facts or intentions currently need my decision?
```

And it must do all of this without:

- inventing history
- double-counting money
- silently reallocating savings
- treating scheduled recurrence as bank verification
- treating expected income as actual income
- combining currencies
- asking unnecessary questions during every timer stop or ordinary expense entry

---

# 102. Before implementation

After reading the repository and this contract:

1. Verify that the architecture is compatible with the actual codebase.
2. Identify only genuine implementation blockers or contradictions.
3. Do not restart broad product ideation.
4. Do not redesign settled semantics merely because another model might choose differently.
5. If the repository reveals a concrete technical issue with this contract, explain it precisely before changing the architecture.
6. Otherwise proceed with Slice 1.

For every meaningful architectural deviation during implementation:

- explain what repository fact forced the deviation
- preserve the semantic contract
- prefer the smallest coherent change

The architecture above is authoritative for Phase 3.
