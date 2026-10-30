# Season activation: approved and integrated

The owner explicitly approved this activation composition on 15 October 2026 and requested integration into the connected onboarding. READY now renders the approved feature-owned presentation with full-pack saved data and the existing activation command; ACTIVE is preserved. See [SEASON_RITUAL_LAYOUT.md](SEASON_RITUAL_LAYOUT.md). Historical pending/rejected statements below describe the prior review and are superseded by this approval.


The owner approved the implementation plan on 11 October 2026, then rejected the working composition on 15 October 2026 because it felt disconnected. On 15 October 2026 the owner approved the floating card with both facings and explicitly requested its use for this candidate recap; see [FEATURED_CARD.md](FEATURED_CARD.md). No activation layout is admitted. The separate working review is `/season-activation-candidate`; no existing onboarding screen is replaced yet. After visual approval, integrate only the `READY` checkpoint in the opening-layout candidate. Preserve all preceding screens, actual activation commands and the existing `ACTIVE` screen.

The chosen direction is a quiet ceremony: approximately 55/45 on desktop, with a large “Your Season is ready.” heading, primary-gold Season emphasis and one explicit action on the left. One shared left-facing FeaturedCard on the right contains the portrait/identity and four divided groups: Character & voice, World & mood, Banners & portrait, Evolving scenes. Below 1024px the order is introduction, recap, activation action, secondary controls. Scrolling remains natural.

The candidate reuses approved Gold Drift, Button, FeaturedCard, branding, typography, LoadingIndicator and the shared `avatarImageStyle` crop function. No new shared treatment or metadata is admitted by plan approval. The recap receives feature-owned identity, excerpts, world direction and full-pack reviewed counts through `SeasonActivationRecap`; it does not infer the pack count from the six images in the current chapter. The sample scene count comes from all canonical `livingArtworkSlots` and its distinct chapters and pace states.

The sample uses the existing Levi preview profile and artwork. It reads name, source, adaptation, setting and visual direction from the saved opening-layout preview when available. A different identity receives no Levi portrait or personality excerpt. Sample artwork, approval claims and counts are explicitly labeled. There are no catalogue, model, worker or Season command requests. Save and leave stores only this candidate’s text values in its separate `become-activation-preview-v1` key; it does not rewrite the opening-layout draft. Storage failure keeps the user here with an explicit error.

Activation is simulated only after an explicit click. A synchronous guard prevents duplicate attempts, the action disables during the sample operation, and the recap remains visible in pending and failure states. Retry uses the same action. Success is explicitly labeled “Preview activation complete”; no real Season or post-activation experience is changed. Review-only controls demonstrate ready, activating, failure, long text and portrait cropping. Gold Drift and the featured rim share the page pause/resume control and respect reduced motion.

## Research

- [Mailchimp](https://mailchimp.com/help/create-and-send-regular-email/) documents reviewing completed sections together before sending.
- [Webflow](https://help.webflow.com/hc/en-us/articles/46651740529811-Publishing-workflow) documents a pre-publish summary.
- [Gamma](https://help.gamma.app/en/articles/11047576-can-i-publish-or-disable-my-gamma-site) separates preview from explicit publishing.

The split composition and ceremonial hierarchy are Become design choices informed by these workflows, not evidence that the layout causes commercial success.

## Verification and admission

Desktop, 1366×768 laptop and 390px phone screenshots verify layout, readable portrait crop and no horizontal overflow. Six browser cases across Chromium and phone WebKit cover dynamic identity/world data, full-pack sample counts, absent matching portrait, mobile ordering, explicit activation, duplicate attempts, failure/retry, completion focus, long content, crop changes, Gold Drift controls/reduced motion, and save failure. TypeScript and targeted ESLint pass. No API calls or browser errors occurred during the preview flow.

The owner has now approved this composition and its connected integration. Review the consolidated journey at `/season-onboarding-candidate?connect=1`; replacing the normal opening still requires complete-flow approval.
