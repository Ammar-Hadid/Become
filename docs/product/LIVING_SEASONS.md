# Living Seasons: current implementation contract

This document records the new Living Season direction. Earlier Season pick and single-banner treatments are historical implementation, not design authority for this system.

## Responsibility boundary

Become computes dates, goal pace, evidence availability, checkpoints, and selected artwork. Nexo assembles bounded, user-scoped facts and explains their significance. C.O.T.S applies an approved, source-grounded character profile to those same facts. Neither AI task may change calculations or select artwork.

## Pace and visual states

Calendar Seasons use their actual day counts in Europe/Amsterdam. A goal criterion follows its own configured start and end when present, otherwise its goal window, otherwise the Season end. Recorded criterion values are compared with targets. Missing or unsupported evidence produces `INSUFFICIENT_EVIDENCE`; it never implies achievement. Across measurable goals the calculated gap is actual progress minus planned progress:

- `ON_TRACK`: gap ≥ −10 percentage points
- `NEUTRAL`: −20 < gap < −10
- `FAR_BEHIND`: gap ≤ −20

Seven chapters advance every 14 days. Each chapter has three states, and every state has a desktop and phone finished composite: 42 approved scene files. Scenery, pose, expression, and lighting evolve as one image. A character's setting determines how setback looks; it does not automatically become a dark battle scene. Insufficient evidence uses the neutral composition and is identified as unassessed in interface copy.

The active pack is immutable from the viewer's perspective. Revising the visual brief, character profile, originals, reference sheet, image, or focal point invalidates the draft pack's readiness. The viewer keeps the previously activated snapshot until a replacement passes review and is activated. The editor exposes 320/375/430 px phone widths and short viewport heights. On phones the image is contained and the interface copy follows it, so cropping and text cannot hide C.O.T.S. Activation still requires human review of every composition. The first six scene images form the pilot; API generation of later chapters waits for that pilot's approval. Manual ChatGPT images and API images use the same review slots.

## Onboarding and character likeness

The approved order is Character → World & mood → References → Banner & portrait → Scenes → Review & activate. Character includes identity confirmation and the five profile sections. Banner editing belongs after references; it no longer appears inside profile editing.

Anime lookup retrieves AniList identities, works and source artwork. Lookup is catalogue-only: bounded name variants help with missing surnames or reversed names, and ambiguous results remain choices for the owner. Character recognition does not call a text model. MyAnimeList gallery images are accepted only after exact normalized name agreement and a shared, type-qualified work ID. Missing or unreachable catalogues never trigger fabricated replacement images. Wikidata and manual entry remain available for other characters and people.

The approved CharacterConfirmation carousel presents retrieved images with their source links. Confirmation imports available images into private Season storage as drafts. Users review their likeness and adaptation in References, or upload authentic originals. At least one reviewed original is required before any reference-sheet, banner, portrait or scene generation. Every exact prompt package includes up to two originals first, then its approved sheet and optional continuity reference (at most four). This anchors visual identity; generation still requires human likeness review.

Character research and Season assembly are the guided onboarding AI tasks. Profile drafting and visual-intent drafting remain separate Nexo task assignments for the detailed workspace. The retired Character identification assignment is discarded when loading or saving existing settings; model profiles and historical run records remain intact. Profile drafting uses explicit source notes and stops for missing evidence instead of inventing temperament or quotations. No key is required for catalogue lookup, manual authorship or upload.

Guided research defaults to the complete character story, including original-source development and its ending when a screen adaptation is unfinished, unless the owner explicitly sets an anime-only, season/episode/arc or spoiler cutoff. Original-source events, screen adaptation coverage and alternate timelines must remain explicitly distinguished; the selected adaptation still anchors the visual identity. A catalogue release year, chosen scenery or visual era must not silently narrow personality coverage. The profile explains enduring traits and development across early, middle and later material; its appearance remains coherent with reviewed authentic references. Corrections refresh research before assembly so expanded scope can bring in new evidence. Successive corrections are retained chronologically, with newer requests overriding conflicts. Research receives World & mood as well as corrections so explicit cutoffs are not lost. A structured coverage record names the endpoint, adaptation distinctions and cited early/middle/late development. Missing coverage asks for evidence or an explicit narrower scope; it cannot silently become a complete profile.

## Profile and intelligence

The profile is versioned, editable, and approved. Its speech patterns, signature phrases, and canon references cite reviewed sources; reaction and visual guidance are distinct. English remains the output language regardless of adaptation reference. Nexo Core assembles task-specific facts from domain queries. The dashboard's Nexo explanation, C.O.T.S daily message, and C.O.T.S conversation are separate AI tasks routed through the central execution layer. Prompt versions, source fingerprints, provider/model snapshots, token usage, optional estimated text cost, and latency are recorded. API keys are encrypted at rest and never returned to the browser.

## Artwork production and budget

Living Season image prompts now resolve through the owner-managed, versioned database templates documented in [`docs/design/IMAGE_DIRECTION.md`](../design/IMAGE_DIRECTION.md). A selected C.O.T.S. and approved visual-intent brief precede new reference, banner, portrait and scene generation. Each API run and upload records the exact assembled package receipt and source revisions. Publishing a template changes future generations only; replacement packages can be staged without spending budget or replacing approved art.

Guided assembly also saves a structured production brief with theme, one visual era, world continuity rules, environmental progression and expression rules. The full profile, production brief, exact owner corrections and original World & mood reach the prompt writer; the short visible summary is not its only input. The final versioned image package retains personality, reaction direction, scope and the production brief in addition to references and composition constraints. Selected identity takes precedence over stale names in world copy; crossover scenery does not grant another character’s costume, powers or affiliations.

The editor creates a reference-sheet prompt and 42 scene prompts. A reference can be uploaded from manual ChatGPT work or generated using Gemini 3.1 Flash Image. Reviewed originals are included in every API image call, alongside the approved reference sheet where applicable; a prior approved scene can also guide continuity. Every generated image is normalized into private storage and remains a draft until approved.

The API generation budget is €15 **per Season pack**. Before each call, Become reserves a conservative amount (12 cents for 1K, 17 cents for 2K in the current configuration) under a database lock. Failed calls retain their reservation because providers may bill failures. The ledger and remaining headroom are visible in the editor. These reservations are a protective estimate rather than a provider invoice. At the cap, manual uploads remain available.

## Model decision gate

No text provider is declared the C.O.T.S winner in code. Configure candidate profiles for GLM-5.3-Flash, Kimi-K3, and Gemini 3.8 Flash and compare them on the same source-grounded gentle, demanding, and public-figure profiles. Include setbacks, recoveries, and multiple conversation turns. Blindly score voice recognition, consistency, natural canon use, factual accuracy, latency, and cost. Lock a model for daily messages only after Become-specific evaluation; conversation may use a different model. See `docs/research/COTS_MODEL_COMPARISON.md`.

## Activation and failure behavior

No pack is activated automatically. A missing generated message leaves the dashboard's clearly labelled preview. AI failure cannot change progress or artwork. A missing selected scene asset falls back to the approved chapter-one neutral composition. Animation is limited to the approved shared motion and typing systems, and reduced motion never delays content or focus.
