# Featured Card

The owner approved the floating AI/featured material and both left/right facings on 15 October 2026, then explicitly authorized shared promotion and its use for the recap on `/season-activation-candidate`. The owner subsequently approved the opening and activation compositions and authorized their integration into the connected onboarding candidate. The consolidated journey still requires its own approval before replacing normal application navigation.

Shared implementation: `src/components/ui/featured-card/featured-card.component.tsx`. Storybook: **Surfaces → Featured Card**, including Facing Left, Facing Right, Season Recap, AI Summary, Paused and Phone. Typed schema: `featuredCardComponentMeta`, exposed under **Documentation → Approved Metadata → Featured Card**.

## Contract

One `FeaturedCard` serves both states through `facing="left" | "right"` (default left). CSS variables mirror perspective, bevel depth, highlights and reflection. Content is never mirrored or duplicated. The material composes shared `Card`; its approved appearance includes primary-gold rim, dark glass face, offset shadow and stationary content.

Pass feature-owned children, native semantic Card attributes and `spacing`. The `as` prop selects section, article or div; associate section/article titles with `aria-labelledby`. `className` belongs to the outer wrapper for grid placement; native `id`, `style` and ARIA attributes belong to the inner semantic Card. Do not override the shared material in a feature. The feature owns text, identity, counts, approved excerpts, saving and operation state.

Pass `paused` from a nearby accessible Pause motion / Resume motion Button, or use `paused={true}` for a static card. The same page state should control other continuous decoration. The twelve-second rim pauses offscreen and in hidden tabs; reduced motion gives a static rim and immediate facing changes. The light never means loading, generation, approval or successful activation. No sound is added.

Owner-editable material values live in `src/app/styles/tokens.css` under `--featured-card-*`; shared CSS owns the mirrored composition. Ordinary surfaces continue using `Card`; long AI prose may use `AiGeneratedText` / Living Ink inside this surface where appropriate. Terminal Prompt remains solely for C.O.T.S. speech.

## Adoption

The original `/featured-card-candidate` route now consumes the shared component for comparison. The activation candidate recap uses `facing="left"`, with dynamic existing recap data and the page's shared pause state. Its activation command, failure/retry, portrait crop and all other onboarding screens are preserved.

## Verification

Promotion passed TypeScript, scoped ESLint and diff whitespace checks. Six existing activation browser cases passed across desktop Chromium and phone WebKit, including dynamic recap values, explicit activation, duplicate prevention, failure/retry, long content, crop, pause/reduced motion and save failure. An additional browser check verified both shared facings, their actual gradients, both Storybook stories and the typed metadata story. Desktop/phone activation screenshots were inspected together; no horizontal overflow or browser errors occurred.
