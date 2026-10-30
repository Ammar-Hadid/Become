# Connected Season onboarding

## Standalone Advanced editing retired — 26 October 2026

At the owner's request, the separate Living Season Studio is no longer an application destination. The onboarding Advanced editing link and duplicate Season-detail artwork link are removed. Settings → Image Direction returns to the guided opening. Legacy `/direction/seasons/[year]/[quarter]/living` URLs validate the Season locator and redirect to its opening. Saved packs, artwork, reference history and APIs used by guided creation remain intact.

The reported Levi background under Kaoruko's name came from a retained reference sheet imported for the earlier Levi demo pack. The legacy hero selected `referenceHref`, while the pack query selected the latest reference without checking identity. The query now chooses the newest reference belonging to the currently selected identity; unrelated reference IDs, image URLs and approval status are excluded. No owner records were deleted or rewritten. Read-only verification on the affected account returns Kaoruko with no current reference URL while retaining the old reference record. Four local reference integration tests and two desktop/phone browser redirect checks pass, along with typecheck and scoped lint.

## Focus preparation admitted — 26 October 2026

The owner approved `/season-preparation-candidate`, explicitly Focus only. The real opening now uses shared `SeasonPreparationProgress` for ASSEMBLING without a query flag, across running, paused and failed states. It uses the actual Season identity/image and durable preparation progress. The full-width ritual content replaces the old split loading screen; its own Save & leave avoids a duplicate footer action. Existing Back is preserved; the owner subsequently removed advanced editing on 26 October 2026. Reading room was removed; simulation controls stay on the retained sample preview. See `docs/design/SEASON_PREPARATION.md` for the approved contract. The 24 October notes below are historical; broader live-provider reliability measurement remains outstanding.

Admission verification: eight desktop Chromium / phone WebKit scenarios passed across the Focus preview, connected normal-opening journey and real-endpoint worker recovery. They cover pinned reading, complete-draft access, reduced motion, real-image binding, polling recovery, pause/resume and unchanged summary/activation gates. Typecheck, scoped ESLint and the design detector passed. Browser/provider checkpoints use disposable accounts and controlled fixtures; no paid generation or owner Season changes were requested.

## Preparation reliability and streaming candidate — 24 October 2026

The latest live failure was a false rejection: complete production-brief sentences ended with source markers (`. [s2]`), but the truncation heuristic only accepted punctuation at the very end. The checker now ignores trailing source markers before checking sentence completion. Incomplete prose still fails; schema, identity, source and coverage validation remain required. A regression exercises the actual assembly validator.

Explicit retry can revalidate a retained output from this exact rejection with the identical task/input fingerprint. It creates a separate READY Nexo record with `recoveredFromRunId` and zero new usage, preserving the original FAILED record. It does not approve a profile or activate a Season. The latest live failed preparation was recovered through this path to SUMMARY / WAITING with provider requests disabled; no new generation or artwork was requested.

OpenAI supports incremental structured-output events ([streaming guide](https://developers.openai.com/api/docs/guides/streaming-responses), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)). Assembly now requests the summary first in its JSON schema and consumes the SDK stream with a bounded whole-stream deadline. Only complete paragraphs are decoded from that first field. They are saved as separate unvalidated `preparationProgress`, guarded by the worker lease, and delivered by the existing authenticated two-second polling. Full output still passes every existing validator before SUMMARY. Other provider adapters continue with their complete-result behavior.

The additive `20261024010000_preparation_progress` migration is applied locally. Preview persistence occurs at paragraph boundaries, not per token. It survives refresh and pause, cannot enter approval/activation, and resets on a new attempt or changed inputs. Completed research is reused for an assembly retry. A transient polling error clears on a successful refresh or command. Provider calls are not blindly replayed after an uncertain outcome.

The owner rejected the first preparation composition as too verbose. `/season-preparation-candidate` now compares two unapproved revisions: **Focus**, a character-led composition with one arriving paragraph, navigation that pins a chosen paragraph, and an accessible full-draft drawer; and **Reading room**, a compact identity column beside the accumulating unframed draft. Both reduce status to one line and a timing estimate, with elapsed time and estimate provenance in the shared tooltip. Failure preserves the draft and presents retry; technical detail is collapsed. Preview controls live in a shared drawer outside the product content. Artwork and prose are explicitly labeled sample material; no generation is requested by this preview.

`/season-onboarding-candidate?connect=1&preparation=1` opts the real flow into the Focus candidate, using its actual saved original when available; it never substitutes sample artwork. The actual opening retains its existing composition pending owner approval. Shared controls, Orbit Arc, drawers, tooltips and Living Ink are reused. Its opt-in `appendKey` preserves completed paragraph animation in Reading room; the portrait composition, Focus navigation and overall layouts remain unapproved.

Timing is an estimate from this account's recent successful calls, not a countdown or a completion percentage. At least three usable samples per required stage are needed. Cached research is excluded from the remaining attempt estimate. The candidate names when the observed range has been exceeded. This small history does not establish a service-level reliability percentage.

Verification: 395 unit tests, 25 isolated PostgreSQL scenarios, typecheck and scoped lint passed. Four desktop Chromium / phone WebKit candidate checks cover arrival without replay, reduced motion, overflow, pause, extended waits and recovery controls. Live recovery proves revalidation without another call; actual streaming transport is tested with controlled SDK events, not a new paid live generation. Four additional connected-flow and real-endpoint recovery checks passed on desktop/phone, including a transient polling failure that clears on recovery. The broader phone check exposed a test navigation race: it replaced the document before its intercepted initial identity request settled; waiting for that response fixed three consecutive runs without suppressing error checks. An isolated production build also passed. Owner approval and broader live-provider reliability measurement remain outstanding.

The approved onboarding is integrated at `/direction/seasons/[year]/[quarter]/opening`. Use `/direction/seasons/2026/4/opening` for the current Season. The connected candidate is the same implementation; unconnected previews are samples. Historical candidate approval notes below describe earlier states, not current routing or implementation proof.

## Start locally

Apply the additive worker-health migration and generate the client before restarting an existing app:

```sh
pnpm db:deploy
pnpm db:generate
pnpm dev:seasons
```

`dev:seasons` starts Next on port 3010 and the Season worker together. Stop an existing `pnpm dev` first. If either process exits, its companion shuts down with an actionable terminal message. Ctrl-C/SIGTERM stops new polling and lets the current worker batch finish. It does not approve or activate anything.

Alternatively, keep `pnpm dev` running and start `pnpm worker:seasons` in a second terminal. `pnpm worker:seasons --once` processes at most one queued batch and exits; it is not a persistent worker. Both entry points use Next's environment loading order (including `.env.local`) and the same PostgreSQL database, `BECOME_DATA_DIR`, and credential encryption secret. Keep `BETTER_AUTH_SECRET`/`BECOME_AI_KEY_SECRET` stable.

Production requires a supervised worker alongside the web process, with matching environment, migrated database and persistent private media. Restart the worker after code changes. Heartbeats are recorded every ten seconds; stale worker rows do not imply availability. This is a single globally claimed run with up to two concurrent image calls, not a distributed high-throughput queue.

Keep the local worker in a terminal or independent process whose lifetime outlasts the agent turn. A command reporting ready once does not establish that it stays running: verify an advancing database heartbeat after its launcher exits. Failed jobs still require an explicit retry; restarting a worker does not automatically replay them.

## Configure the actual account

Save the provider key in Settings → Nexo on the account that owns the Season. Onboarding text tasks require explicit assignments and account-owned credentials. They do not inherit another provider or a shared environment OpenAI key.

For the owner's Sol selection, create an OpenAI profile with exact model ID `gpt-6.1-sol`, medium reasoning, medium verbosity, 16000 maximum output tokens and a 180-second timeout. Assign it to **Character research**, **Season assembly**, and **Season image prompts**, then save settings. Other task assignments remain independent. Character recognition is AniList catalogue lookup and needs no AI key; the retired identification task stays removed.

The [official Sol model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) documents Responses, structured output and web-search support. Sol does not support none/minimal reasoning. Research currently requires the implemented OpenAI Responses web-search adapter; Google/Z.AI/Moonshot profiles cannot be used for that task. Model metadata access is not proof that the account can execute the entire research/schema request.

Run a read-only, account-scoped diagnostic:

```sh
pnpm check:seasons --email=your-account-email
```

This checks all three assignments, decryptability, OpenAI/Google model metadata access and the worker heartbeat. It never prints credentials or sends generation requests. Failures return a nonzero exit code. Full runtime failures distinguish rejected credentials, model access, invalid configuration, quotas and timeouts without echoing raw provider payloads.

Automatic images separately require the same account's Google key for `gemini-3.1-flash-image`. Manual uploads require neither a Google key nor a text key; requesting AI-written prompts does require the text profile. Prompt writing alone never invokes the image provider. API billing is separate from ChatGPT subscriptions. A normal automatic pack uses research + assembly + outline + banners + portrait + seven chapter prompt batches (12 text runs before corrections/retries); the default daily ceiling is 20.

## Run the real flow

1. Open the normal Season opening. Choose the catalogue character/adaptation, then enter World & mood.
2. Continue to research and assembly. Read the cited summary, request corrections as needed, and review one or two authentic originals for likeness before approval.
3. Approve the summary. Choose automatic or manual banners. Review desktop and phone banners, then separately prepare and approve the portrait.
4. Choose scene creation once. Review each chapter's three pace states in both formats, six compositions per chapter. All seven chapters and 42 scenes must be reviewed.
5. Inspect the final recap and explicitly activate. Refreshes and worker completion never activate a pack.

Missing task routes/credentials stop before queueing. A queued run with no fresh worker heartbeat becomes an actionable failure after a 30-second grace period (worker heartbeats expire after 45 seconds). A RUNNING job whose five-minute renewable lease expires is failed by the worker or the next page read, so restarting the worker is not required to reveal the failure. Fix setup/start the worker, then explicitly retry. Already completed results and image reservations remain saved. A successful text result arriving during pause is retained without starting the next task.

Failed automatic artwork can return through the existing **Back** control to preparation and manual uploads. Failed/paused assembly can return to World & mood for correction. In-flight calls must finish before their inputs are changed. Failed or uncertain image calls retain their reservation and need explicit retry; selecting manual creation never invokes the image provider. Prompt requests have a bounded wait, concurrent-submission guard and explicit expiry; no failed template is relabelled as AI-authored.

## Character coverage and artwork context — 23 October 2026

Research v4 records the story scope, explicit endpoint, adaptation differences, cited early/middle/late development and missing evidence. Complete original-story coverage is the default, with unadapted source material clearly labeled; explicit owner cutoffs still win. World/mood reaches research as well as assembly, but scenery cannot silently choose a canon cutoff. Missing coverage moves to the existing question checkpoint. Source IDs must be unique and coverage citations must exist in the retrieved source set. Research explicitly ignores requests for downstream deliverables in owner input: it supplies evidence only. Schema descriptions name each field’s purpose and target concise complete text below hard size limits. Rejected responses retain private raw output, consulted sources and bounded field/code diagnostics under FAILED status; they are never accepted content.

Assembly v6 copies that scope into the versioned profile and writes a production brief in the visual intent: theme, visual era, world rules, progression and expression rules. Owner correction history is saved chronologically (bounded at 20,000 characters with an explicit consolidation error, never silent truncation). No previous generated draft is sent back as authority. Selected identity overrides stale names in world text. These changes add structured JSON fields; older/manual records remain readable without a database migration.

Image-prompt writing v3 receives the entire approved profile and visual intent, not just the summary. Exact owner corrections survive alongside the production brief. Target aspect ratios and canonical ON_TRACK/NEUTRAL/FAR_BEHIND meanings are explicit inputs to assembly and prompt writing; on track does not necessarily mean ahead. The seven-chapter outline is shared by banners, portrait and all scene batches; duplicate chapter prose, repeated composition prose and visibly unfinished sentences are rejected. The preparation progression field holds a concise overview; it must not attempt to enumerate 21 chapter/state combinations inside one bounded field. The final package also retains personality, reaction direction, researched scope and production brief, including on the manual path. Receipts and immutable saved packages remain authoritative; existing approved images are not replaced.

Controlled checks cover all 45 image packages (two banners, one portrait and 42 scenes), with full brief delivery, ordered authentic references and zero image-provider calls. These checks verify data flow and admission rules, not artistic quality or factual completeness of external sources. Actual image output still requires every existing human review and explicit activation.

The live account completed research v4 and assembly v5 for Manjirou Sano. Eight consulted sources, explicit manga-ending/anime scope, the freedom theme and a single anime visual era were saved unapproved. Earlier research v3 responses overfilled metadata with downstream deliverables; retained diagnostics exposed that task-boundary failure. The successful assembly still overfilled its progression field, so the complete seven-stage overview was copied verbatim from its own saved summary into a fresh unapproved draft revision using the normal draft-persistence path, with no extra provider call. Assembly v6 and prompt-writing v3 add concise-field guidance and unfinished-prose rejection; these last guardrails are fixture-verified, not a claim that a complete real image pack has been generated. The live image ledger remains empty; human reviews and explicit activation remain outstanding. Final verification: 389 unit tests and 26 isolated database scenarios passed, plus typecheck, scoped lint and an isolated production build. The worker was restarted with the final code.

## Earlier live provider verification — 23 October 2026

The owner subsequently found that the generated draft overemphasized early episodes despite requesting the full anime. Research contained later sources, but assembly inferred an early personality era from the training-ground scenery. Research prompt v2 and assembly prompt v3 now separate full-continuity character development from scenery and visual era, honors explicit cutoffs, and asks for early/middle/late evidence. Owner corrections clear cached research so new scope reaches the research task; the existing draft remains context, not authority over the correction. Regression checks: 24 isolated database scenarios, 383 unit tests, typecheck, scoped lint and production build passed. Generated coverage still requires owner review; prompt compliance is not a deterministic guarantee of character quality.

The broader live research also exposed a literal-versus-percent-encoded parentheses mismatch in a wiki URL. Source comparison now canonicalizes those path characters and percent-escape case, while preserving query parameters and encoded path separators. Tests still reject a different chapter, episode query or encoded slash. The personality field now allows 2,000 characters separately from the 600-character speech/canon items; the live full-arc profile had hit the old shared cap mid-sentence. Assembly was rerun against the saved evidence to repair that field. The completed 12-source research was revalidated against its original task fingerprint and recovered without another research call; the previous draft stayed unapproved throughout.

The selected account's OpenAI `gpt-6.1-sol` profile completed real character web research and Season assembly. The worker saved the resulting draft as `SUMMARY / WAITING`, with research, profile, visual intent and summary completed. No summary approval, image generation or activation was performed by this verification. The remaining artwork/review/activation journey is still not verified with real providers.

The first real request exposed an adapter defect: Zod emits `format: "uri"` for source URLs, but the [OpenAI structured-output format subset](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas) excludes it. The OpenAI adapter now removes that keyword only from its cloned wire schema, including nested schemas. Original Zod URL validation and consulted-source validation remain required before admission. Schema rejection now identifies an application defect instead of telling the owner to change their profile. The regression reproduced the rejected schema before the fix; 378 unit tests, typecheck and scoped lint passed afterward.

## Verification boundaries — 17 October 2026

Controlled verification uses disposable users in a separate migrated local database and a private temporary media root. No personal credentials are copied into fixture accounts. Unit tests cover routing, supported research provider, Sol reasoning constraints and redacted actionable errors. PostgreSQL scenarios cover full automatic and manual packs, real research/assembly validation through a mocked provider, prompt-only execution, source/approval checks, budget, stale and duplicate operations, paused completion, contention and worker expiry. Browser tests exercise desktop/phone connected composition with controlled checkpoints and real authenticated HTTP setup/expiry failures. These checks do **not** establish a complete real AI-generated Season or artwork quality.

Latest checks: 376 unit tests passed; 23 isolated PostgreSQL integration scenarios passed; connected-flow and real-endpoint recovery browser tests passed on desktop and phone (four cases total). Typecheck, scoped lint and an isolated production build passed. The local app and worker were restarted with the final code and returned HTTP 200 and a registered heartbeat. The owner's existing Google credential successfully accessed `gemini-3.1-flash-image` metadata; no image was generated. The OpenAI key/profile and three task assignments were still absent at this check, so account-level Sol execution remains unverified.

```sh
pnpm typecheck
pnpm test
# Set DATABASE_URL and BECOME_DATA_DIR to an isolated test database/media root first.
RUN_ONBOARDING_INTEGRATION=1 RUN_LIVING_INTEGRATION=1 pnpm exec vitest run src/features/seasons/living/onboarding/onboarding.integration.test.ts src/features/seasons/living/services/living-reference.integration.test.ts
BECOME_E2E_PORT=3017 pnpm exec playwright test e2e/connected-season-onboarding.spec.ts e2e/season-onboarding-recovery.spec.ts --project=chromium --project=mobile --workers=1
```

Never run fixture suites while a live worker polls their database. Use `eslint` on the changed source/e2e/tools files; unrestricted lint may include unrelated existing work.

## Persistence and review

An additive migration creates user-scoped onboarding runs and command receipts and adds an image reference mode and optional image operation key. Existing packs retain `SHEET`; guided starts choose `ORIGINALS`. A run records stage, review revision, identity/profile/intent/brief versions, draft, evidence, pending image operations, completed text tasks, question, status and worker lease.

Authenticated, origin-checked GET/POST `/api/direction/seasons/onboarding` returns the current saved view and accepts prepare, save-world, start, correct, approve-summary, approve-banner, approve-portrait, approve-chapter, regenerate, pause, resume and activate commands. Every command includes a UUID operation key and expected revision. Approval binds the current saved profile/intent and actual banner/scene revision IDs. Correcting a summary creates a fresh unapproved draft; the previously activated snapshot remains visible.

The worker uses PostgreSQL locks and a renewable lease, processes one run at a time, and sends at most two image calls concurrently. Desktop and phone banners are generated and reviewed first. Summary approval now stops at banner preparation, with explicit AI generation or manual upload. Banner approval opens separate portrait preparation/review. Portrait approval asks how to create all seven chapters; each chapter contains six separately reviewed compositions. The next chapter waits for approval of its predecessor. Activation requires the approved character profile, visual intent, separately reviewed banners and profile portrait, authentic originals and all 42 scenes and records completion of the opening.

Provider calls have no automatic retries. Completed image keys are not replayed. Failed or uncertain calls retain their artwork reservation and require explicit retry authorization. An expired worker lease marks the run failed instead of automatically resending a call. Pause lets the in-flight call finish; it prevents the next batch from starting. API text usage, search calls, consulted URLs and estimated costs are logged centrally through Nexo.

Generated artwork and the prompt inspector use the same reference selector: up to two reviewed originals first, then approved portrait and approved banner or prior matching-format/state scene. Sheets are optional for guided packs and mandatory for legacy packs. All generation uses the central exact package and receipt; approved imagery is never silently replaced. The €15 image cap and manual upload fallback remain in place. Automated banner copy contains no unverified attributed quotation.

## AI-written prompts and manual artwork

The owner-approved Image Prompts workspace is connected at `/settings/image-direction`, retaining template history. It shows shared style, two banner recipes, portrait, 42 chapter/pace/format recipes and an advanced optional sheet recipe. Save draft and Publish operate on actual owner-scoped records. Existing published owner rules/drafts seeded chapter-specific recipes through the additive migration; no owner text was overwritten. The secondary inspector assembles real Season context without a model call and uses the prompt Drawer/Living Ink.

Authenticated `/api/direction/seasons/living/prompts` writes an immutable seven-chapter outline and batches of two banners, one portrait or six chapter prompts via Nexo task `cots.image-prompt-writing`. An explicit task assignment selects the text profile; there is no onboarding default-profile fallback. Saved batches include input fingerprints, actual Nexo run/model provenance and bound exact packages. Reopening/copying/retrying uploads reuse the saved prose; explicit regeneration creates a new batch. Writing failures retain an explicit failed record, never an AI-labeled template fallback. Text-model costs stay in Nexo run accounting, separate from the image cap.

Preparation commands include `set-artwork-method`, `generate-artwork`, `review-artwork`, `open-artwork`, `select-scenes-method` and `switch-scenes-method`. All use expected revisions and command operation keys. Manual upload accepts its own operation key, expected revision, selected scene attempt and optional copied prompt batch/receipt. Decode/orientation and current approved sources are revalidated before admission. Existing images can be uploaded without a text credential; their receipt does not claim AI authorship.

Scene attempts are persisted separately for AI/manual methods. Keep restores compatible source revisions and chapter approvals; Delete removes unused assets through durable cleanup jobs. Worker results carry their original attempt and lease. A switch stops new dispatch; in-flight kept results cannot enter the selected pack. Reservations stay spent when an attempt is discarded. Only selected-attempt artwork contributes to continuity, readiness and activation. Successful activation cleans unused kept attempts while protecting active snapshots; leaving/failure preserves them. Uncertain provider outcomes require an explicit retry.

Legacy packs retain `TEMPLATE`/sheet history; new guided runs choose `AI_AUTHORED`/originals. The additive `20261012010000_manual_imagery_prompts` migration is applied to the local app database. Mocked-provider verification covers full automatic and manual packs, cached prompts, stale/duplicate uploads, Chapter-4 restoration, late worker results, failure and budget. No paid quality comparison or real provider evaluation was performed.

## Historical integration notes

The following dated notes are retained as history. Current behavior and approval status are described above and in AGENTS.md.

### Consolidated connected review — 15 October 2026

The owner approved the four-step opening layout and activation composition and requested integration for whole-flow review. `/season-onboarding-candidate?connect=1` now uses shared SeasonRitualLayout/StepIndicator around the existing real connected controls and imagery preparation/reviews. One header, backdrop and motion state persist across preparation, imagery and activation. The four preparation screens use their actual step title/numeral and independent working-region scroll. Adaptation controls render inside confirmation. Local form edits are distinguished from server-saved work; storage failures remain visible.

READY uses the approved floating recap, sourced directly from current approved saved profile, world, portrait/crop and full 42-slot pack, with no extra model call. Existing activation command, expected revision, operation key, failure/retry and ACTIVE completion remain. A synchronous client guard prevents duplicate command submission. The normal application opening remains unchanged pending review/approval of this consolidated connected journey. The two standalone layout routes remain labeled sample previews.

### Catalogue name fallback — 15 October 2026

The connected lookup initially returned no match for `Levi Ackerman`: AniList's live record uses `Levi` (45627). The saved identification-model runs had completed, but their alternate full-name spelling also returned no catalogue records. Lookup now tries at most two shortened/name-order variants after an empty exact lookup and prefers retrieved candidates with a normalized matching source title. It never fabricates identities or bypasses confirmation. The same fallback applies to an AI-suggested alternate spelling. Catalogue outages still propagate as service errors. Twenty focused lookup/gallery unit cases, typecheck and scoped lint passed; direct catalogue requests confirmed the mismatch without new paid AI calls.

### Inline recognition · 16 October 2026

Connected preparation now moves directly from catalogue lookup to World & mood, showing shared RecognizedCharacter with correction actions. Continue saves the selected identity and edition and starts text preparation. `start` takes world/mood only; `approve-summary` now requires `sourceImageIds` (one or two) and `characterLikenessConfirmed: true`. It validates their current identity/adaptation and approves those originals transactionally before artwork preparation. See `docs/design/RECOGNIZED_CHARACTER.md`.

### Normal opening replacement, 16 October 2026

The owner explicitly requested using the newer two-question onboarding at the actual opening entry. `/direction/seasons/[year]/[quarter]/opening` now loads `SeasonOnboardingConnected` from the Season feature. The connected controller/view and CSS are owned by `living/onboarding/components/` and `styles/`; only sample models and review controls remain in design review. The authenticated preview consumes the same component.

`getSeasonOpeningOnboarding` initializes a missing user-scoped Season draft with an empty update on conflict. It leaves existing identity, profile, world, run, approval and artwork history intact. Rendering the page never queues generation. Automatic arrival preserves Not now, deferred-opening storage and local text drafts; activation still occurs through the existing explicit command. The detailed editor remains at `/direction/seasons/[year]/[quarter]/living` through Advanced editing.
