# Long AI text reveal candidate

Researched 11 October 2026. Owner requested a separate proposal for long summaries, retaining the existing Terminal Prompt for C.O.T.S. conversations and daily messages.

## Primary evidence

- [Vercel Streamdown animation](https://streamdown.ai/docs/animation) documents word-level fade, blur-to-sharp and a 4px slide. It explains that animation smooths batches of incoming tokens, cautions that character animation adds DOM nodes, and removes animation wrappers when complete. [Vercel’s 2.5 release](https://vercel.com/changelog/streamdown-2-5) documents sequential word cascades and configurable stagger. This is direct evidence for implementation mechanics, not proof that every Vercel product uses this treatment.
- [Notion AI for documents](https://www.notion.com/help/guides/notion-ai-for-docs) describes writing directly on the page. It supports a document-oriented reading surface rather than treating a brief as a chat message. It does not specify animation timings.
- [Claude artifacts](https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them) describes a dedicated surface for substantial standalone content. It supports the separation of conversation and document output, not a specific animation claim.

These are established platforms or their official tooling; the sources do not establish that an animation caused commercial success. No exact Notion or Claude text-reveal choreography is claimed.

## Follow-up evidence: perceptible AI motion

- [Google Design: Illustrating the Gemini App](https://design.google/library/gemini-ai-visual-design) describes concentrated leading edges with diffused trails, intentional direction, and inner activity to communicate AI thinking and synthesis. This is direct product-team evidence for Gemini’s visual language, not evidence that Gemini’s answer text uses our exact animation.
- Streamdown’s documented blur-to-sharp reveal supplies the text-specific counterpart. Become combines these principles using its own primary gold. No claim is made that a particular motion universally proves AI authorship or caused product success.
- [Microsoft Fluent shimmer](https://fluent2.microsoft.design/components/ios/core/shimmer/usage) is explicitly a loading treatment. It was reviewed but not copied into the completed summary; the candidate continues to distinguish revealing prepared text from a pending model operation.

## Proposal: Living Ink

Keep the approved text-sized AiTextFrame, Sparkles heading and identity line. Replace terminal punctuation and monospace in this separate candidate with the existing reading typography. Short word cascades catch a soft gold tint and resolve into ordinary text. Each paragraph finishes in roughly two to three seconds; the reader is never held behind a character-length timer. First words have no intentional start delay. Completed paragraphs become plain text with animation spans removed.

The focal moment is the prepared brief arriving in gold. There is no moving cursor, vertical movement, looping text shimmer, automatic scroll, sound, new loading state or extra summary button. After the owner requested a stronger AI feeling, the arriving words now materialize from a soft gold silhouette into luminous gold lettering, then resolve to the normal reading color. Text-shadow softness and a short-lived light trail are tied to each word’s arrival; completed text does not shimmer. Existing border motion remains controlled through the shared frame. Replay and pause are preview controls; reduced-motion preview and the device preference reveal the full document immediately.

The shared tokens now own the approved timing (720ms arrival, 24ms word step capped at 1600ms). After owner feedback, paragraphs reveal strictly in order: the last word’s completed animation unlocks the next paragraph. Only the eligible paragraph can begin, and only when visible. Intersection and page-visibility listeners pause reveals when unseen. Pending paragraphs retain their geometry but their visual text stays hidden after hydration; server-rendered content remains readable without JavaScript. Full paragraph geometry remains in the DOM; assistive technology receives each complete paragraph once. This is already-prepared text, not simulated live generation or a source-verification signal. No dependency is added.

## Admission boundary

`/ai-long-text-candidate` remains a design-review route and now consumes the explicitly approved shared implementation. Onboarding owns its dynamic identity and evidence; samples remain labeled illustrative. Only the Living Ink component has been approved, not the entire onboarding candidate.

## Validation scope

Preview load, first meaningful content, desktop and phone composition, keyboard replay/pause, offscreen pause, completion cleanup, citations, stable layout, reduced motion and console health. This candidate makes no provider calls and does not change stored onboarding records.


## Admission after owner review

On 11 October 2026 the owner explicitly approved the sequential gold-trail refinement and requested promotion. Living Ink now lives in shared `AiGeneratedText`, with Storybook and typed ComponentMeta, and is used by the onboarding summary and review pages. Terminal Prompt is exclusively for C.O.T.S. speech. This component approval does not approve the whole onboarding candidate. See [AI_GENERATED_TEXT.md](../design/AI_GENERATED_TEXT.md).
