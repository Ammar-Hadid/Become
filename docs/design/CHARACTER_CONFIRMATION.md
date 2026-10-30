# Character confirmation

Approved by the product owner on 10 October 2026 after reviewing the rendered isolated candidate, including the darker image area and carousel.

Use `CharacterConfirmation` from `src/components/ui/character-confirmation/`. It composes approved glass cards, buttons, icon frames, badges and loading. Lookup notices use immediately readable status text; Terminal Prompt is solely for C.O.T.S. speech. The image area uses `--color-background`; height uses `--character-confirmation-image-height` in `tokens.css`. Images remain centered and contained. Previous/next, left/right keys, and horizontal touch gestures cycle through real retrieved images. There is no autoplay or added animation. A single image hides unnecessary paging controls.

The feature supplies character name, source work, adaptation, real image URLs and source links, and Yes / Different version / Wrong character callbacks. Do not pass generated sample artwork as retrieved evidence. Only label a result AI-assisted when a connected model actually ran. Confirmation does not replace human review of authentic source images or generated likeness. The isolated preview is `/character-confirmation-candidate`; Storybook states live under Character / Character Confirmation.

Features may supply `actions`, `emptyImageMessage`, and `footer` content while retaining the approved shared layout and carousel. Use approved shared buttons for actions; the feature owns their copy, refs, busy state and feedback. Omitting these slots preserves existing defaults; `footer={null}` omits the optional caption. These composition slots do not approve the isolated character-identity candidate or its integration.

On 16 October 2026, the owner approved replacing connected onboarding’s separate confirmation checkpoint with inline recognition. See [RECOGNIZED_CHARACTER.md](RECOGNIZED_CHARACTER.md); this carousel remains available for explicit identity-review surfaces and historical previews.
