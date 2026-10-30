# Season character entry design QA

Date: 2026-10-10. Scope: the owner-approved card-free character entry screen in the real Season onboarding route.

Source visual truth: `/Users/elpridro/.codex/generated_images/01a12676-7fb6-7cc0-a38a-dd14c812d75d/exec-b33aa0aa-7de1-4320-9e62-d29acc897e39.png` (1586 × 992).

Implementation: `http://localhost:3010/direction/seasons/2026/4/opening`. Final screenshot: `/tmp/become-season-entry-final.jpg` (1586 × 992), captured through the Codex in-app browser. CSS viewport and screenshot dimensions match, device pixel ratio and visual viewport scale are 1. The normal in-app viewport screenshot included panel scaling; full-page capture supplies the normalized comparison instead.

State: editing the existing saved character, with the name field focused. The implementation keeps the owner's real Levi Ackerman / Attack on Titan values; the source uses illustrative Okabe / Steins;Gate values. No identity confirmation or character edits were saved during verification.

## Comparison and findings

Source and implementation images were opened together in one comparison input, then the phone screenshot was inspected. The full view verifies the large two-line headline, open composition, matching copy, long underline fields, and equal-width action row. The readable field labels, focus rule, wand button and secondary controls were also checked directly against DOM measurements; an additional crop was unnecessary at this resolution.

- **Fonts and typography:** Manrope supplies the approved display family; Inter supplies input and descriptive text. The first implementation's heading was too small against the mockup. Its approved token now scales with both viewport width and height, and the final two-line hierarchy matches the intended dominant entry. Featured inputs retain the separately approved shared size.
- **Spacing and layout:** The card and duplicate page heading are removed from character entry. All three desktop actions have equal tracks and equal 16px gaps. On phones the actions stack at full width. The approved 48px app gutter replaces the mockup's approximate larger inset; phones retain their 16px gutter.
- **Colors and tokens:** Existing Become graphite, ivory, muted text and gold focus tokens are reused. The existing approved ambient grid remains behind the form. Its warmer glow differs from the generated reference; this is minor atmospheric polish rather than a usability or hierarchy mismatch.
- **Image quality and assets:** No character art is part of entry. Existing ambient background and the real shared Button/wand icon are reused; the form and copy are actual editable HTML. No screenshot is used as a functioning UI.
- **Copy and content:** The question and description match the selected design. The kicker reads “A new beginning.” Saved names remain real feature-owned values. Exit, save state and Save and leave remain available.

Intentional product constraints: actual shared buttons retain their approved 36px height and typography rather than the image model's oversized imitation. Keep current character remains conditional on an existing identity. Save and leave is retained for the real persistent flow.

## Comparison history

1. Initial normalized desktop comparison: headline presence was weaker than the selected design. Increased the display/copy tokens and added a compact vertical rhythm for short laptop screens.
2. Final comparison: `/tmp/become-season-entry-final.jpg`; no actionable P0/P1/P2 visual issue remains. The shared control constraints above are intentional.

## Runtime and responsive checks

- Desktop: 1586 × 992, equal action widths, no horizontal overflow, native focus underline visible.
- Laptop: 1280 × 720; `/tmp/become-season-entry-laptop.jpg`. Each action is 379px wide and the row ends at 710px, keeping primary actions above the fold.
- Phone: 390 × 844; `/tmp/become-season-entry-phone.jpg`. All actions are 358px wide, text wraps cleanly, and no horizontal overflow occurs.
- Keyboard: Tab moves from character name to the associated source field.
- Manual entry toggle: reveals the existing category/adaptation fields; switching back restores assisted entry without submitting the lookup form.
- Keep current character: returns to the saved workspace; Change character restores the new entry. The workspace's own page heading remains available when entry is absent.
- Real Find my character request: displayed the existing disabled/loading state, then the provider-backed no-match state for the saved Levi query. No confirmation was made. The successful-match path was not rerun in this visual change.
- Browser console: no errors or warnings for the exercised interactions.
- TypeScript and targeted ESLint: passed. The existing onboarding test expectation was updated for the new visible main heading; browser checks here used the in-app browser rather than rerunning the Playwright CLI suite.

Follow-up polish (P3): the existing background glow is subtler than the generated concept. This does not block the approved composition.

## Owner-requested scale correction

The owner's later request supersedes the generated reference's oversized scale. Entry occupies 60% of desktop content width. The owner subsequently requested restoration of only the original large H1; supporting copy remains capped at 18px and entry field text at 28px. At phone widths (720px and below) it fills the available width. Shared input defaults remain unchanged outside this entry. Desktop DOM checks confirm the 60% ratio, equal action widths, and no clipped labels; phone checks confirm no horizontal overflow. Latest evidence: `/tmp/become-season-entry-large-heading.jpg`. Live measurements: H1 108px, description 18px, fields 28px, desktop width 60%, no horizontal overflow.

final result: passed
