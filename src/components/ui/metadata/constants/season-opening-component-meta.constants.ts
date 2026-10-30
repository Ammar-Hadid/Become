import type { ComponentMeta } from "../types/component-meta.types";
export const stepIndicatorComponentMeta = {
  component: {
    name: "StepIndicator",
    category: "molecules",
    type: "navigation",
    description:
      "Owner-approved informational Season phase/numbered preparation progress, approved 15 October 2026. Real checkpoints determine completed/current/upcoming state.",
    path: "src/components/ui/step-indicator/step-indicator.component.tsx",
  },
  props: {
    items: {
      type: "readonly StepIndicatorItem[]",
      required: true,
      description:
        "Feature-owned IDs, labels and complete/current/upcoming states. No navigation callbacks.",
    },
    label: {
      type: "string",
      required: true,
      description: "Accessible name for the native ordered list.",
    },
    variant: {
      type: '"phase" | "numbered"',
      required: false,
      defaultValue: "numbered",
      values: ["phase", "numbered"],
      description:
        "Compact parent phases or numbered preparation using the actual item count.",
    },
  },
  variants: {
    axes: { variant: ["phase", "numbered"] },
    purpose: {
      "variant.phase":
        "Character → Imagery → Activate Season across the journey.",
      "variant.numbered":
        "Three preparation steps above the current working area.",
    },
  },
  relationships: {
    commonPartners: ["SeasonRitualLayout", "Button"],
    role: "Informational progress. Back and explicit actions handle navigation.",
    keyboardSupport: "No interactive markers or focus stops.",
    screenReader:
      "Native ordered list, aria-current=step, and explicit completed/current/not-started descriptions.",
  },
  tokens: {
    color: {
      current: "--color-primary",
      complete: "--color-success",
      upcoming: "--color-border",
    },
    spacing: { gap: "--spacing-lg; --spacing-sm" },
  },
  aiHints: {
    priority: "high",
    keywords: [
      "Season phases",
      "numbered step indicator",
      "preparation progress",
    ],
    selectionCriteria: {
      choose: "Use approved two-level Season journey progress.",
    },
    usage: {
      useCases: ["Season preparation", "Imagery and activation phase progress"],
      commonPatterns: [
        {
          name: "Two levels",
          composition:
            "Phase indicator in the ritual header; numbered indicator only during three preparation steps.",
        },
      ],
      antiPatterns: [
        {
          scenario:
            "Advance because an animation finished or make the markers skip review.",
          reason: "Progress represents actual application checkpoints.",
          alternative:
            "Map persisted stages to state; use explicit approved actions.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
export const seasonRitualLayoutComponentMeta = {
  component: {
    name: "SeasonRitualLayout",
    category: "organisms",
    type: "container",
    description:
      "Owner-approved immersive Season shell: 40/60 preparation split, step title on the left, viewport-height workspace with only the right content scrolling, compact mobile introduction, and full-width later phases. Approved 15 October 2026.",
    path: "src/components/layout/season-ritual/season-ritual-layout.component.tsx",
  },
  props: {
    header: {
      type: "ReactNode",
      required: true,
      description:
        "Brand, phase indicator, optional review-only motion control and truthful feature-owned save status. Actual onboarding omits the review motion button.",
    },
    introduction: {
      type: "ReactNode",
      required: true,
      description:
        "Feature-owned Season identity, current step number, H1 and supporting copy; title uses opening-step-title.",
    },
    children: {
      type: "ReactNode",
      required: true,
      description:
        "Current form, approved imagery content or activation presentation.",
    },
    footer: {
      type: "ReactNode",
      required: true,
      description:
        "Feature-owned Back, Save and leave, budget and advanced actions; null omits the footer.",
    },
    split: {
      type: "boolean",
      required: true,
      description:
        "True for preparation's fixed-height split; false for naturally scrolling imagery and activation.",
    },
    paused: {
      type: "boolean",
      required: true,
      description:
        "Shared decorative pause state; pass to summary and featured card too.",
    },
    contentKey: {
      type: "string",
      required: true,
      description:
        "Current feature checkpoint/correction key; resets the split workspace scroll on deliberate step changes.",
    },
  },
  variants: {
    axes: { layout: ["preparation", "full-width"] },
    purpose: {
      "layout.preparation":
        "Viewport-sized preparation, compact introduction on phones, internally scrolling working region.",
      "layout.full-width":
        "Imagery/activation with normal page scrolling and equal page gutters.",
    },
  },
  relationships: {
    commonPartners: [
      "AmbientLight",
      "StepIndicator",
      "Button",
      "AiTextFrame",
      "AiGeneratedText",
      "FeaturedCard",
    ],
    role: "Shared presentation. Copy, data, save commands, approval and activation belong to the feature.",
    keyboardSupport:
      "Working region is keyboard focusable and scrollable; feature headings receive focus immediately on step changes.",
    screenReader:
      "Header/footer landmarks and labeled preparation main/working region; Gold Drift stays decorative.",
  },
  tokens: {
    spacing: {
      gutters: "--space-app-page-gutter; --space-page-edge-mobile",
      inset: "--opening-content-inset",
      header: "--opening-header-height; --opening-footer-height",
    },
    typography: { title: "--opening-intro-size" },
    motion: { background: "--ambient-light-*" },
  },
  aiHints: {
    priority: "high",
    keywords: ["Season opening", "immersive preparation", "ritual shell"],
    selectionCriteria: {
      choose: "Reuse for the approved connected Season journey.",
    },
    usage: {
      useCases: [
        "Three-step Season preparation",
        "Season imagery and activation shell",
      ],
      commonPatterns: [
        {
          name: "One journey",
          composition:
            "Keep one shell/AmbientLight mounted across checkpoint changes, with one page motion state.",
        },
      ],
      antiPatterns: [
        {
          scenario:
            "Nest a new page backdrop or treat draft text as confirmed server saving.",
          reason: "Duplicates motion and misrepresents persistence.",
          alternative:
            "Embed feature content; supply truthful local/saving/saved/failure labels.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
