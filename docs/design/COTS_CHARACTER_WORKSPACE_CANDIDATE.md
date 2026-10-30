# C.O.T.S. character workspace — approved

Current routing update, 26 October 2026: the owner removed the standalone Advanced editing / Living Season Studio. Its old `/living` URL redirects to the guided opening, which owns preparation, imagery and review. Studio references below describe historical integration, not an available product destination.

The owner approved the `/cots-character-candidate` page after a small left-overlay adjustment. The approved banner and portrait editor live under `src/components/ui/`; the Season workspace is under `src/features/seasons/living/character-workspace/`. Banner and workspace visual controls live in `src/app/styles/tokens.css`. The preview route remains available for comparison.

## Required character portrait

Each Season character needs its own square profile portrait revision, separate from the desktop and phone banner compositions and the 42 evolving Season scenes. Generation uses the approved identity sheet, character name and adaptation, the current visual identity and boundaries, voice and reaction notes, and Season art direction. A compatible approved banner may be an image reference for visual continuity, but the portrait must be a separately composed image with the face legible in a small circular crop. The prompt adapts expression, setting, and lighting to the character's entered temperament; genre or gender alone never determines whether the portrait looks formidable, gentle, cute, or dramatic. Generated assets contain no baked-in UI copy.

Provider generation and manual upload lead to the same portrait review slot. Manual upload works without an API key. Store the original image revision and a reversible circular crop (`x`, `y`, `zoom`) separately so a later crop adjustment does not destroy the original. Review and approve the portrait alongside both banner compositions and their copy before activating a pack. Identity or visual-direction changes return affected art to review. An active Season displays the approved revision; closing the Season freezes that revision for its archive. Provider calls use the existing Season artwork budget and central AI task layer. The image skill examples on this preview page do not consume a Nexo provider key.

## Response readiness

The workspace uses a visible, deterministic completeness rule before offering a combined character portrait and response test: two titled sources with substantive notes, two detailed speech patterns linked to those sources, specific reactions to success/setback/recovery, recognizable visual direction, and visual boundaries. Short word-count floors are completeness heuristics that catch blank or one-word placeholders; they are **not** a claim of canon accuracy or AI quality. A model and provider key are still required for an answer to the user's own question. Without them, the preview can show only a clearly labeled answer to its sample question. Do not silently present that sample as an AI interpretation of a custom question.

The response uses the actual character name. Its portrait opens the shared dialog with direct drag-to-reframe, keyboard-accessible zoom and position sliders, and manual upload. The full-width primary button at the bottom returns to the question form. This approved crop treatment is shared; its saved image and crop remain Season-owned.

The separate approval preview retains its own uploaded portrait and crop in browser storage for each example character, so refreshing the candidate page does not discard a review adjustment. Preview storage does not alter a Living Season; the live workspace saves image revisions and crop through the Season-owned banner service.

## Approved Reactions navigation

The owner approved the five-step rail on `/cots-reactions-candidate`, including the final phone gesture correction. The shared `CharacterStepRail` keeps four card widths on desktop and two on phones. The active step becomes the first visible card; order wraps after Reactions. A wheel gesture or a horizontal or vertical swipe on the rail advances exactly one step, while the page position stays fixed. The scrollbar is hidden, and pinch zoom remains available. Click and keyboard selection play the approved Pulse Pin cue; gestures stay silent. Reduced motion switches positions immediately.

Step 5 contains the three reaction fields and the two visual fields. Their existing profile values and save/approval rules remain Season-owned. Save profile revision and Approve profile stay available from every step.

## Season entry

The approved workspace is in the Character step of the new Season opening at `/direction/seasons/[year]/[quarter]/opening`, alongside Identity. Inside it, the World, Character, Intent, Reference, Scenes, and Activation controls use the signed-in user's Season pack and its profile and banner actions. The later Living Season Studio uses the same saved pack. The demo-only Levi image remains a labeled, unsaved example until that Season has its own reviewed banner revision; other characters use their own saved artwork or the shared banner fallback.

## Current onboarding scope

Identity and Character are the only top-level Season onboarding steps. Standards, Images, Words, Finalization, and their legacy authoring, collection editing/reuse, and featured-choice functionality are removed. Stored historical records remain readable. Character retains the Living Season workspace and its World, Character, Intent, Reference, Scenes, and Activation controls, including profile, banner, portrait, and artwork review. Identity retains character search. Finishing onboarding saves identity data without automatically activating a Living Season pack.

Embedded Character content fills the page inside its shared gutters, without the editor's 1500px cap or the character workspace's extra inset. Its main panel and context sidebar remain responsive.
