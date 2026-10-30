# Approved progress language

The product owner selected **Plasma Core**, **Season Ticks**, and **Segmented Halo** from the interactive progress comparison. These are the supported shared treatments.

Use `ProgressIndicator` in `src/components/ui/progress/` with a `variant`, a truthful `value`/`max`, and a descriptive accessible `label`:

- `plasma-core` (the default): a compact continuous measure for goals and ordinary cards.
- `season-ticks`: a long discrete rail for season and other bounded progress. It should represent a measured quantity, such as elapsed season time; do not label it achievement unless the underlying query measures achievement.
- `segmented-halo`: a compact radial summary when there is room for its numeric readout and caption.

When a linear indicator reaches its measured maximum, its fill and edge use the shared success color. Partial values retain their area accent. This completion treatment applies to `plasma-core` and `season-ticks`; the radial halo retains its area identity. An empty or unavailable measure must not be passed as complete.

The three treatments use the approved **Living Light** progress motion: value changes animate; resting indicators do not loop. The global motion choice for other controls and surfaces remains **Precision Light**. Operating-system reduced-motion preferences remove transitions while leaving the value and accessible progress semantics intact.

Change shape, dimensions, color mixing, glow, and animation timing in the progress and motion sections of `src/app/styles/tokens.css`. Change the 52 season units or 40 halo units in `src/components/ui/progress/progress-indicator.config.ts`. Pass `area` to use the current domain palette, or override `--progress-accent` from an owning surface. Do not copy variant markup into feature components.

Progress must be sourced from domain-owned facts. Indeterminate work is a loading state, not a percentage. If progress is unavailable, do not fabricate a value to fill a treatment.
