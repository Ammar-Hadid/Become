import type { ComponentMeta } from "../types/component-meta.types";

export const ambientLightComponentMeta = {
  component: {
    name: "AmbientLight",
    category: "atoms",
    type: "container",
    description:
      "Gold Drift: owner-approved soft gold light moving diagonally across the entire viewport, behind content. Approved 11 October 2026 for Character, Imagery and Activate Season.",
    path: "src/components/ui/ambient-light/ambient-light.component.tsx",
  },
  props: {
    paused: {
      type: "boolean",
      required: false,
      defaultValue: "false",
      description:
        "Freeze both light fields at their current position. Onboarding exposes a nearby pause/resume Button only in review previews; actual onboarding keeps automatic reduced-motion and visibility handling.",
    },
    children: {
      type: "ReactNode",
      required: false,
      description:
        "Feature-owned page content. The component owns only the backdrop, its stacking context and motion lifecycle.",
    },
    nativeProps: {
      type: "HTMLAttributes<HTMLDivElement>",
      required: false,
      description:
        "Page id, className, style and native attributes. The feature owns its dimensions, gutters and landmarks.",
    },
  },
  variants: {
    axes: { motion: ["animated", "paused", "reduced-motion"] },
    purpose: {
      "motion.animated":
        "Two diffuse fields follow different diagonal paths on offset 16-second and 22.4-second cycles while their page is visible.",
      "motion.paused":
        "Preserve both positions when paused, offscreen or in a hidden tab; resume without resetting their cycles.",
      "motion.reduced-motion":
        "A static gold backdrop preserves content and every action, without spatial motion or sequencing.",
    },
  },
  relationships: {
    commonPartners: [
      "Button",
      "AiTextFrame",
      "AiGeneratedText",
      "CharacterBanner",
    ],
    exposesState: ["paused", "data-motion"],
    role: "Decorative viewport backdrop. Never signals loading, generation, approval or activation. Use one instance per page and retain it through phase changes.",
    keyboardSupport:
      "No interaction on the light fields; they never intercept pointers or focus. Onboarding review previews provide a keyboard-accessible pause/resume control with aria-pressed and aria-controls; actual onboarding omits that review control.",
    screenReader:
      "The decorative field is aria-hidden. Page children retain their native semantics; motion has no announcement or busy state.",
  },
  tokens: {
    color: {
      accent: "--color-primary",
      foundation: "--color-background",
      strength:
        "--ambient-light-base-strength; --ambient-light-flow-strength; --ambient-light-flow-tail-strength; --ambient-light-horizon-strength; --ambient-light-horizon-tail-strength",
    },
    motion: {
      cycles:
        "--ambient-light-cycle; --ambient-light-secondary-cycle; --ambient-light-secondary-offset",
      easing: "--ambient-light-ease",
      paths:
        "--ambient-light-flow-start; --ambient-light-flow-end; --ambient-light-horizon-start; --ambient-light-horizon-end",
      opacity: "--ambient-light-dim-opacity; --ambient-light-bright-opacity",
      reduced: "prefers-reduced-motion: reduce",
    },
  },
  aiHints: {
    priority: "high",
    keywords: [
      "Gold Drift",
      "ambient light",
      "gold gradient",
      "Season onboarding",
      "full-screen backdrop",
    ],
    selectionCriteria: {
      choose:
        "Reuse the approved immersive Season backdrop across preparation, imagery and activation. Keep text and artwork visually dominant.",
    },
    usage: {
      useCases: [
        "Season character preparation",
        "Season imagery review",
        "Explicit Season activation checkpoint",
      ],
      commonPatterns: [
        {
          name: "Persistent Season backdrop",
          composition:
            "Wrap the journey once in AmbientLight, provide a shared pause Button, and update feature-owned content without remounting the backdrop. The same paused state can also control AiTextFrame and AiGeneratedText.",
        },
      ],
      antiPatterns: [
        {
          scenario: "Treat movement as pending work or successful activation.",
          reason:
            "Ambient motion is decorative and follows no operation state.",
          alternative:
            "Use LoadingIndicator and real saved state for generation or activation feedback.",
        },
        {
          scenario: "Copy the gradient CSS or brighten it over the content.",
          reason:
            "The approved treatment is a quiet, shared background with stable readability.",
          alternative:
            "Reuse AmbientLight and its owner-editable shared tokens.",
        },
        {
          scenario: "Animate without pause controls or ignore reduced motion.",
          reason: "Continuous decorative movement must remain optional.",
          alternative:
            "Supply a pause/resume Button or set paused to true; retain the built-in reduced-motion and visibility behavior.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
