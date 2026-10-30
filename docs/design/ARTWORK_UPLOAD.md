# Artwork upload

The owner approved the manual imagery and Image Prompts candidates on 12 October 2026. `ArtworkUpload` is admitted in `src/components/ui/artwork-upload/`, with **Forms → Artwork Upload** stories and typed approved metadata.

Use one drop area per composition. Banners show one desktop/mobile area at a time; portrait has its own area; chapters show three pace areas for the selected format. Reuse shared Card, Button and loading treatments. No new sound or animation is introduced.

The component accepts one still JPEG, PNG, WebP or AVIF up to 6 MB, supplies a keyboard file picker, uploaded preview, actual dimensions, replacement, contextual prompt action and actionable file errors. The feature receives the raw `File`, validates decoded dimensions/orientation and persists it. Resolve `onUpload` only after successful storage. Reject on failure; retain the previous asset. Pending selection blocks duplicate uploads. A prompt action passes its trigger so the feature’s shared Drawer restores focus on close.

The feature owns identity, Season/attempt/revision/operation IDs, receipt, prompt writing, reference downloads and approval. Uploaded means stored, never approved. Prompt generation is separately requested; viewing/copying never dispatches image generation. Use Living Ink for prompt prose and controlled primary Button feedback for copying.

Preview sizes use `--artwork-upload-preview-*` tokens; all surface, focus and loading values use existing approved treatments. Stories demonstrate empty, uploaded, phone, failure and interactive local object-URL states; they do not persist Season records or call providers.
