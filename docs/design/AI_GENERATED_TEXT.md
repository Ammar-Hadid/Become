# Living Ink: longer AI-generated prose

On 11 October 2026 the owner explicitly approved `/ai-long-text-candidate` after two refinements: paragraphs reveal strictly in sequence, and each word materializes through a primary-gold glow trail before settling to normal text. The approved implementation is shared `AiGeneratedText` in `src/components/ui/ai-generated-text/`. Storybook exposes **AI → Generated Text** and **Documentation → Approved Metadata → Ai Generated Text**. The candidate now consumes this shared implementation.

Use Living Ink for longer AI-generated summaries, briefs, reports and paragraphs. **Terminal Prompt / `AiTypingText` is solely for C.O.T.S. speech**, including conversations, character response tests and Daily Messages. Neither component represents pending generation: use the shared loading treatment for actual model work. Presentation does not prove authorship, source accuracy or approval.

`text` receives complete prepared prose; blank lines separate paragraphs. The feature owns the wording, character identity, citations and persistence. Words appear in their final layout; the next paragraph waits until the preceding paragraph completes. Finished paragraphs replace their animation spans with plain selectable text. Text changes reset the reveal. The shared implementation supplies `type-body-lg`, paragraph spacing and a 68ch maximum paragraph width. It has no character defaults or model calls.

Use `paused` with an adjacent shared Pause motion / Resume motion Button, including `aria-pressed` and `aria-controls`. When composed with `AiTextFrame`, pass the same pause state to both components. Pause retains progress. A paragraph starts only when visible, pauses offscreen and in hidden tabs, and resumes in place. The component does not scroll the page. `staticText` shows full prose immediately; device reduced motion automatically does the same, including mid-reveal preference changes. Server/no-JavaScript output stays readable. Screen readers get each full paragraph once, while animated words are aria-hidden; no live region announces words incrementally.

The approved numeric values live together in `src/app/styles/tokens.css`: `--ai-generated-text-copy-width` (68ch), `--ai-generated-text-duration` (720ms), word step (24ms), delay cap (1600ms), light/soft radii, glow strengths and settling tint. Features must not duplicate or substitute the cadence, glow or paragraph sequence. Replay is a demonstration control that remounts the shared text, not a required product action.

The Season onboarding summary and glow review page compose Living Ink with the approved text-sized gold frame. The heading and identity come from their current character model, source work and adaptation. Compact source links remain feature-owned. Approval and corrections stay available throughout the reveal; there is no “Show full summary” button. Storybook covers long prose, one paragraph, phone, paused, static reading and review-frame composition.

This approval admits Living Ink only. The complete onboarding candidate remains under owner review.

### Streaming preparation candidate (not yet approved)

The 24 October preparation candidate opts into `appendKey`, a stable attempt ID for append-only **complete paragraphs**. Existing paragraphs must remain byte-identical; restarting or changing earlier text requires a new key. This preserves the approved cadence, paragraph order, visibility, reduced-motion and pause behavior while preventing arrived text from replaying at every polling update. Only candidate routes currently use this option. It does not change the complete-text contract for existing consumers or imply approval of the new preparation composition.
