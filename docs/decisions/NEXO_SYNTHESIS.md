# Nexo: explicit, reviewed utility synthesis

Historical implementation and verification record. Its visual, layout, navigation, copy and interaction choices are not requirements or a baseline for the frontend redesign. Domain semantics and objective technical constraints remain applicable.


Nexo is a server-only utility boundary in the modular monolith. It owns runtime profiles, provider adapters, operational limits and run persistence. Entrepreneurship owns its source queries, prompt, validation, proposal and acceptance semantics. Provider SDK types do not escape the adapter. This is an explicit addition to the deferred AI roadmap; COTS personality, presentation generation, messaging and background agents remain outside this change.

Only `entrepreneurship.soFarWeKnow.summary` executes. The active task registry supplies its version and Settings label; evidence/conversation/outreach IDs are reserved without handlers. Domain code requests a task through `executeAiTask`; Nexo resolves the user's task assignment and profile, then dispatches through its provider adapter. The initial adapter uses the official OpenAI SDK, Responses API, Structured Outputs, no tools, Responses storage disabled (`store: false`) and no automatic SDK retries. Configure `OPENAI_API_KEY` server-side and assign a model profile in Settings → Nexo. Reasoning and verbosity default to provider defaults unless explicitly selected; unsupported model options surface as a failed run without changing accepted content.

Profiles are reusable across active tasks and can be changed in Settings without deployment. They currently select an OpenAI model and per-run controls; all profiles use the server's single OpenAI credential. Provider-specific credentials, additional provider adapters, layered task overrides, automatic routing and a generalized AI Control Center are deferred until an implemented use case needs them. The UI lists implemented task assignments from the same active registry used by the runtime and does not expose reserved tasks as usable features.

## Ownership and review

Every action authenticates the current user. Settings and runs are user-scoped. Each settings save retains an immutable configuration revision. Run records capture the operation key, task and prompt versions, settings/profile snapshot, bounded input, validated output, token usage, provider request ID, elapsed execution time and status. Available usage is retained even when a provider response fails domain validation. A repeat operation does not issue a second provider request. Failure preserves prior editions; explicit retry starts a new operation. Daily run and per-run output/time limits are configurable. Cost estimation, quality evaluation and usage dashboards are deferred.

Generation stores a proposal only. The user reviews sources and may edit, accept or discard. Acceptance rechecks source context and current understanding in a serializable transaction, writes new revisions and one edition, and never deletes omitted findings or resolves omitted questions. Corrections preserve prior editions. Legacy observation citations remain relational; new claim revisions can also store a versioned source manifest with current, scoped sources.

## Bounded facts and freshness

A single eligible-source SQL relation supplies both complete-set fingerprinting and selected excerpts. Scope uses explicit exploration links, including decision and experiment links; a broad domain association is insufficient. SQL computes counts. Money remains currency-qualified minor units and offer outcomes never imply income.

Three fingerprints have distinct purposes:

- Material: complete source membership, versions/status/relationship payloads and exploration scope. It excludes accepted understanding and generated editions.
- Base understanding: all current/historical-state identities and versions for acceptance concurrency.
- Context: the exact bounded input, selected sources, coverage and preceding fingerprints.

Provider input is capped at 64KiB UTF-8. Excerpts are selected deterministically in rounds across source kinds, newest within each kind, so a long transcript cannot displace every observation, decision and experiment. This balances coverage rather than scoring certainty. Coverage includes omitted sources and understanding. Source text is data, never instructions; citation keys must belong to the exact input. Uncited structured findings are accepted only as an explicit hypothesis or question. The accepted edition records the post-acceptance understanding fingerprint so acceptance does not make itself stale.

Freshness is read-only. New/changed/removed source material yields “Refresh recommended”; manual understanding edits yield unpublished changes. No data mutation automatically generates AI output. Frozen source references are checked independently of the current excerpt cap so old corrected/withdrawn sources remain identifiable.

## Verification

Unit tests cover UTF-8 bounds, citation allowlists, uncertainty classification and separate fingerprints. Isolated local integration tests cover proposal isolation, idempotent generation/acceptance, frozen editions, source corrections, foreign ownership rejection, stale review rejection, provider failure, and volume beyond collection/message limits. The OpenAI adapter is mocked in these tests; they do not spend provider credits or send personal records.
