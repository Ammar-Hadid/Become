# Ambient Light: Gold Drift

The owner approved the softened, full-screen Gold Drift on 11 October 2026 and requested the same motion during Imagery and Activate Season. `src/components/ui/ambient-light/ambient-light.component.tsx` is its shared owner. This approval covers the backdrop, not the complete onboarding layout or step indicator.

Wrap the page once in `AmbientLight` and keep the component mounted across journey phases. The feature supplies content, page dimensions, gutters, landmarks, navigation and saved state. Two diffuse primary-gold fields move along separate diagonal paths on offset 16-second and 22.4-second cycles. They remain behind the content and ignore pointer input. Only transform and opacity animate; gradient pixels and blur remain unchanged.

Review surfaces supply an adjacent shared Button controlling `paused`, with `aria-pressed` and `aria-controls`. Keep that state across preparation, image reviews and activation. The same state can pause the AI text frame and Living Ink together. Pausing freezes the light at its current position; resuming preserves the cycle. The component pauses while its page is offscreen or the document is hidden. Reduced motion shows a static gold backdrop immediately.

On 17 October 2026 the owner clarified that the manual Pause motion / Resume motion button belongs only in onboarding review previews. The actual connected opening hides it. Automatic reduced-motion, offscreen and hidden-tab behavior remain enabled; operation controls for pausing real generation are independent.

Gold Drift is decorative. It never indicates generation, loading, approval, activation, accuracy or saved progress. Use the shared loading treatment and actual operation state for those purposes. Decorative fields are `aria-hidden`; feature-owned content retains its semantic and keyboard behavior.

Approved strength, paths, opacity, easing and timing are owner-editable through `--ambient-light-*` in `src/app/styles/tokens.css`. Reuse the component rather than copying gradient CSS into a feature. Use one instance per page; Storybook isolates examples in their own frames.

Storybook **Surfaces → Ambient Light** includes Animated, Paused, Phone, Imagery and Activation examples. **Documentation → Approved Metadata → Ambient Light** exposes its typed `ComponentMeta`, registered in the shared approved metadata inventory.

The treatment draws on [Google Design’s directional gradient language](https://design.google/library/gemini-ai-visual-design), [Stripe’s animation implementation guidance](https://stripe.com/blog/connect-front-end-experience) and [web.dev’s transform/opacity performance guidance](https://web.dev/articles/animations-guide). The exact gold palette, strength and diagonal paths reflect the owner-approved Become preview.
