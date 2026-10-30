# Resizable artwork viewport

Approved by the product owner on 7 October 2026 from `/design-review/phone-resize`, including the revision that holds the outer card steady while only the screen changes size. The same shared `ResizableViewport` runs in that review page and in Living Season phone-composition approval.

## Use

`ResizableViewport` lives in `src/components/ui/viewport-preview/components/`. Pass the current logical `size`, `onSizeChange`, and artwork children. The parent owns the artwork, copy, persistence, and approval rules. The shared component owns the dimension readout, fixed-size review canvas, screen frame, glowing edge and corner handles, and keyboard interaction.

The right edge changes width, the bottom edge changes height, and the corner changes both. Arrow keys move by the configured fine step; Shift plus an arrow uses the coarse step. Home and End select the minimum and maximum for the handle's axes. Handle labels and values remain accessible when motion is reduced. The canvas reserves room for the largest configured screen so resizing never changes the parent card's height; it can reflow when the actual page viewport changes.

## Easy adjustments

| Change                                                                            | Edit                                                                                                       |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Minimum/maximum phone width and height, initial size, keyboard steps              | `PHONE_ARTWORK_VIEWPORT` in `src/components/ui/viewport-preview/config/resizable-viewport.config.ts`       |
| Accent, stage width and padding, handle/grip geometry, border/glow/fade strengths | The **Approved resizable artwork viewport** section in `src/app/styles/tokens.css`                         |
| Artwork, safe copy, approval requirements                                         | The consuming feature, such as `src/features/seasons/living/components/living-season-editor.component.tsx` |

Keep `--viewport-preview-edge-clearance` large enough for the right handle at the maximum width. `--viewport-preview-handle-overhang` reserves room below the tallest screen. These two visual values are read from CSS by the component, so token changes affect the fixed canvas as well as its handles. Typography remains on the locked semantic scale.

The interaction uses the shared `Button` for its corner handle and the approved motion tokens. It introduces no new sound cue. The original artwork approval and character-visibility checks remain authoritative; changing the preview dimensions does not approve or save an image.
