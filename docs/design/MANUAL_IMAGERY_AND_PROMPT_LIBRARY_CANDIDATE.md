# Manual imagery and Image Prompts — approved

The owner approved the implementation plan for AI-authored prompts and manual Season artwork. Both working review pages were explicitly approved on 12 October 2026. Their upload treatment is shared and the real compositions are connected to owner Settings and the authenticated onboarding candidate. The broader opening, onboarding and activation candidates retain independent approval gates.

- `/manual-season-imagery-candidate`: banner and separate portrait preparation, one-format uploads, scene-method choice, three upload areas per format, chapter-by-chapter review and kept-attempt restoration.
- `/image-prompt-library-candidate`: shared style, banners, portrait and chapter recipes, with one selected editor and a secondary Season-context preview.

## What works in this candidate

The manual page accepts actual local still JPEG/PNG/WebP/AVIF files through drop or file selection. It checks the existing 6 MB/12 megapixel limits, rejects unsuitable orientations, normalizes local previews and stores them in IndexedDB. Desktop/mobile banners and the separate portrait enter the existing candidate artwork review. Manual chapters require six files and the existing review of all three pace states in both formats before approval. Local crop changes persist.

Manual and AI demonstration attempts own separate scene files, cached prompt samples, selected chapters and approvals. Switching offers **Keep progress until onboarding finishes** or **Delete progress now**. A kept attempt restores its chapter and reviews; delete-now removes that attempt from the saved local snapshot. Completing the sample onboarding retains only the selected attempt. None of this removes any real Season media or changes its database records.

Prompt preparation and automatic creation are explicitly labeled simulations using hand-authored prompt fixtures and existing illustrative Levi artwork. A chapter preparation fills six distinct slot prompts; preparing banners fills the desktop/mobile pair. Reopening an existing prompt does not run the simulation again. Prompt-writing and upload failure controls exercise preservation and retry. Copy uses the readable prompt, with selectable text if clipboard access fails. Downloads are clearly labeled illustrative artwork; the preview never calls them authentic originals.

All banner, portrait and scene **View & copy prompt** actions use the approved shared Drawer. Prompt prose uses Living Ink, revealing paragraphs in sequence with its gold trail. Each opening replays the presentation of the cached text without another writing call. A drawer-local Pause/Resume control preserves progress, reduced motion shows full text immediately, and Copy always copies the complete prompt regardless of reveal progress. Escape closes the drawer and returns focus to its trigger. The method-switch confirmation and Settings Season-context dialog retain their existing roles.

The library scopes 42 scene recipes by chapter/pace/format, plus two banners, portrait, shared style and an optional reference-sheet recipe. It reuses the real document editor. Draft saving, publication and version history persist in a separate localStorage record. Unsaved edits prevent navigation to another recipe. Publishing here only affects the preview library. The Season-context dialog is labeled sample data and does not invoke AI.

Local storage keys are `become-manual-imagery-preview-v1` inside the `become-artwork-candidates` IndexedDB database, and `become-image-recipe-library-preview-v1` in localStorage. Existing onboarding preview keys are neither read nor modified.

## Presentation boundary

The approved upload-area treatment lives under `src/components/ui/artwork-upload/`; the local preview adapter remains under `src/features/design-review/manual-imagery/`. It supplies an empty drop surface, keyboard file-picker access, uploaded preview, replace action, dimensions, prompt action and per-file errors. Each scene format shows three such areas. Labels, file operations, prompt state and persistence remain caller-owned.

The page compositions reuse shared Button, Card, Dialog, Select, document editor, Living Ink text, loading indicators and Gold Drift. Existing artwork review and portrait cropping remain intact. No new sound is introduced. The upload treatment and page compositions are admitted; see [ARTWORK_UPLOAD.md](ARTWORK_UPLOAD.md). Primary-button success feedback was separately approved on 12 October 2026 and is now used for prompt copying; see [BUTTON_FEEDBACK.md](BUTTON_FEEDBACK.md).

## Connected implementation

Shared promotion includes Storybook examples, typed ComponentMeta and usage rules. Real Settings retains `/settings/image-direction` and uses saved server versions. Authenticated `/season-onboarding-candidate?year=2026&quarter=4` uses the real preparation panels; the default routes remain labeled demonstrations.

The connected implementation must add a Nexo image-prompt-writing task, immutable prompt drafts with source fingerprints and writer provenance, a seven-chapter progression outline, exact package receipts and chapter-specific template keys. The same saved AI-authored creative direction must feed both automatic calls and manual copying. Code validates identity, format, ordered references and fixed output requirements; failure cannot masquerade as successful AI drafting. Images still enter existing human approval commands.

Persist separate scene attempts and associate their assets and worker operations. Selected-attempt filtering must apply to image references, readiness, counts and activation snapshots. Method switching must stop new dispatch, retain late results on the original attempt and coordinate durable cleanup of discarded files. Successful real activation, not leaving the page or finishing an animation, deletes unused kept attempts. Preserve active artwork, legacy versions and financial run records.

The default demonstration pages still make no provider calls or real Season changes. Their approved connection phase now uses the persisted prompt writer, attempts, uploads and commands described in [implementation status](../development/MANUAL_IMAGE_PROMPTS_IMPLEMENTATION.md). No paid comparison was performed. The complete onboarding and activation compositions still require separate approval.

## Research

- [Webflow Assets panel](https://help.webflow.com/hc/en-us/articles/33961269934227-Assets-panel): contextual file-picker/drop uploads and replacement.
- [Adobe Firefly in Figma](https://helpx.adobe.com/firefly/web/app-integrations/figma/edit-images-with-text-prompts.html): contextual prompt copying and generation controls.
- [Midjourney organization](https://docs.midjourney.com/hc/en-us/articles/33329462451469-Organizing-Your-Creations): scoped folders and creation context.
- [ACL prompt expansion research](https://aclanthology.org/2024.acl-long.189/): evidence of aesthetic benefits in its evaluated system, not proof for Become's provider or characters.
- [OpenAI image-generation tool](https://developers.openai.com/api/docs/guides/tools-image-generation): route-specific automatic prompt revision.
- [Gemini image guidance](https://ai.google.dev/gemini-api/docs/image-generation): concrete composition, explicit constraints and reference continuity.

The proposed UX and AI-writer design are Become-specific adaptations. No quality uplift is claimed without a separately authorized comparison on Become's real workload.

## Review gate

Present both working pages and ask exactly **“Do you like it?”**. Their explicit visual approval is required before promotion and connection, according to [SHARED_LIBRARY.md](SHARED_LIBRARY.md). The complete onboarding and activation designs retain their separate approval status.

## Verification

Browser plugin not available; used the repository Playwright runner. All twelve desktop Chromium/phone WebKit cases passed across targeted runs. They cover orientation validation, actual local file uploads, prompt caching/copy fallback, failure/retry, three scene areas per format, method keep/delete/restore after Chapter 4, final cleanup only after review completion, recipe edit/draft/publication persistence, and portrait upload with keyboard crop persistence.

Desktop 1680×940, laptop 1366×768 and phone 390×844 screenshots were inspected. A phone grid intrinsic-width overflow was corrected and confirmed absent in the second visual pass. No relevant console errors or provider/API calls were observed. Typecheck, targeted lint and whitespace checks passed. Real AI quality, authenticated upload services, migrations and worker recovery await the connection phase.
