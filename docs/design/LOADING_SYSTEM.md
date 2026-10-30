# Approved loading language

The product owner selected **Orbit Arc** for compact waits, **Edge Trace** for a loading card or content region, and **Eclipse** for longer waits. These are the three shared loading treatments. The dashboard remains a separate, unapproved visual checkpoint.

Use `LoadingIndicator` from `src/components/ui/loading/` with a meaningful `label` and a `variant` of `orbit-arc`, `edge-trace`, or `eclipse`. The component exposes a status to assistive technology, while its animated parts are decorative. The owning action or region remains responsible for its real pending state, `aria-busy` where appropriate, completion, error and cancellation. Mount the indicator only while work is genuinely pending; never let its animation delay completion or imply a percentage.

`area` selects the dashboard gold or the Engineering, Finance, Entrepreneurship, or Content accent. Direction currently uses the shared gold. An owning surface may override `--loading-accent` for a local context. All recurring sizes, colors, glow strengths, and animation cycles for these variants live in the **Approved indeterminate loading** section of `src/app/styles/tokens.css`. The component CSS owns geometry and keyframes, and `prefers-reduced-motion` leaves a visible, static cue.

Do not implement new loader treatments inside features. Extend this shared component if a real use case cannot be represented by one of the approved variants. The remaining proposals in the comparison gallery are unapproved and must not become application defaults.
