# Approved manual imagery and AI-written prompts

The owner explicitly approved both working preview pages on 12 October 2026. Shared promotion and the connected implementation are complete. The complete Season opening/onboarding and activation candidates retain independent approval requirements.

## Shared and feature presentation

- `ArtworkUpload` is admitted under `src/components/ui/artwork-upload/`, with raw-file callbacks, drop/file selection, actual dimensions, replacement, errors and loading. **Forms → Artwork Upload** stories and typed approved metadata document its contract; see `docs/design/ARTWORK_UPLOAD.md`.
- Real preparation panels and prompt Drawer live under `src/features/seasons/living/imagery/`. They reuse the admitted page composition, Gold Drift, branding, buttons, cards, Living Ink and primary-button copy feedback. Shared/production code does not import preview upload/storage adapters.
- Settings `/settings/image-direction` is now **Image Prompts**, retaining its owner guard and historical versions. Shared style, banners, portrait and chapters expose one recipe editor. Chapter 1–7, desktop/mobile and pace select the 42 scene recipes. The secondary real-Season inspector assembles reusable direction without a model call.
- The authenticated `/season-onboarding-candidate?year=2026&quarter=4` connects real Season data. Summary approval stops before banner preparation; banners and portrait each offer explicit AI/manual creation. Portrait approval asks for one scene method across all chapters. Manual chapters require six separately uploaded and reviewed images; explicit activation requires 42 current approved scenes.
- Default demonstration routes remain labeled sample data. Their existing review layouts and the broader opening/activation candidates are preserved.

## Domain behavior

The additive `20261012010000_manual_imagery_prompts` migration is applied to the local app database. It preserves legacy pack/template history and seeds chapter recipes from owner-published generic recipes and saved drafts without overwriting chapter edits. New guided packs use AI_AUTHORED/originals; legacy TEMPLATE/sheet packs remain readable.

Nexo task `cots.image-prompt-writing` authors a cached seven-chapter outline and versioned batches of two banners, one portrait or six chapter prompts. Task routing takes precedence over the default medium-reasoning text profile. Immutable input fingerprints include approved character/world/originals, recipe versions and continuity. Packages record actual writer/model/run provenance, fixed format/2K requirements, ordered references and exact receipts. Both API generation and manual copying use that exact package. Reopening/copying/upload retries reuse saved prose; explicit regeneration creates a new version. Missing credentials and writing failures are explicit, preserve work and never become an AI-labeled fallback. Text costs remain in Nexo accounting, separate from image reservations.

Separate persisted AI/manual scene attempts preserve kept files, reviews and chapter progress. Switching stops new dispatch; late provider results stay on the original kept attempt. Only the selected/source-current attempt supplies references, readiness, counts and snapshots. Delete and activation cleanup queue durable file removal with retries, while keeping provider spending records. Snapshot `activatedArtworkIds` permanently protects previously activated artwork. Successful activation removes unused kept progress; leaving or failure preserves it. Uncertain image-provider outcomes need explicit retry.

Upload commands are authenticated and bind slot, attempt, expected revision and optional copied prompt receipt. Current approved sources are rechecked after decoding/storage. Scene and banner uploads have operation fingerprints and idempotent replay; pending UI blocks duplicate selection. Existing images may upload without AI writing, without falsely claiming authorship.

## Verification and local runtime

- 36 Living Season domain unit checks pass.
- 12 mocked-provider onboarding integration checks plus three legacy-reference checks pass on isolated local PostgreSQL. They cover both full packs, 42 manual reviews, Chapter-4 restoration, prompt caching/failure, revision/operation replay, at-most-two image calls, late switching, deletion, budget exhaustion, worker recovery and explicit activation.
- Desktop Chromium/phone WebKit checks cover actual authenticated banner/portrait/six-scene uploads, refresh, recipe draft/publication, missing-key recovery, prompt Drawer and Storybook. Screenshots were inspected; no relevant runtime errors or horizontal overflow remain. Preview regressions pass across targeted runs; typecheck, scoped lint and whitespace checks pass.
- All provider calls in automated tests were mocked. No paid generation or quality comparison was performed.
- App: 3010; Storybook: 6006. The local worker runs via `node --conditions=react-server --import tsx tools/season-onboarding-worker.ts`; zero queued jobs were confirmed before startup. The isolated QA server/database are not the owner's data.

The working tree contains substantial other unfinished work. No reset, cleanup or bulk commit was performed. The Prisma reset guard was respected: QA used a fresh database rather than erasing an existing one.
