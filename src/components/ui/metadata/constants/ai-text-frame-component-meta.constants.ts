import type { ComponentMeta } from "../types/component-meta.types";

export const aiTextFrameComponentMeta = {
  component: {
    name: "AiTextFrame",
    category: "molecules",
    type: "container",
    description:
      "Owner-approved text-sized primary-gold frame for AI-prepared prose, with a soft glow and slow orbiting border highlight. Approved 11 October 2026 after the text-width refinement.",
    path: "src/components/ui/ai-text-frame/ai-text-frame.component.tsx",
  },
  props: {
    heading: {
      type: "string",
      required: false,
      description:
        "Optional approved Sparkles heading at the top of the frame; automatically labels its article unless a native accessible name is supplied.",
    },
    description: {
      type: "string",
      required: false,
      description:
        "Identity line beneath the heading. The feature supplies the current character name, source work and adaptation; the shared component has no character defaults.",
    },
    headingLevel: {
      type: "2 | 3",
      required: false,
      defaultValue: "2",
      description:
        "Semantic heading level. Use 3 below an existing section heading; both levels retain the approved section-title treatment.",
    },
    children: {
      type: "ReactNode",
      required: false,
      description:
        "Feature-owned readable text, optional heading and citations. Text is available immediately.",
    },
    paused: {
      type: "boolean",
      required: false,
      defaultValue: "false",
      description:
        "Stops the decorative highlight. Provide an adjacent shared Button controlling this prop when animated.",
    },
    nativeProps: {
      type: "HTMLAttributes<HTMLElement>",
      required: false,
      description:
        "Article id, aria-label or aria-labelledby, className and other native attributes. Do not use aria-busy to describe the decorative glow.",
    },
  },
  variants: {
    axes: { motion: ["animated", "paused", "reduced-motion"] },
    purpose: {
      "motion.animated":
        "An eight-second highlight moves around the edge while visible in the foreground tab.",
      "motion.paused":
        "Static reading surface with the full prose and citations available.",
      "motion.reduced-motion":
        "Device preference removes the animation immediately while preserving the border and all interaction.",
    },
  },
  relationships: {
    requires: ["Card"],
    commonPartners: ["Button", "AiGeneratedText", "LoadingIndicator"],
    exposesState: ["paused", "data-animated"],
    role: "Semantic article around AI-prepared prose. The feature owns provenance, content, corrections, approval and saving.",
    keyboardSupport:
      "Native keyboard access to contained links. Supply a keyboard-accessible pause/play Button with aria-pressed and aria-controls.",
    screenReader:
      "The optional heading labels the article automatically; otherwise supply aria-label or aria-labelledby. Decorative highlight has no accessible content, live-region behavior or busy state.",
  },
  tokens: {
    color: {
      accent: "--color-primary",
      surface: "--color-surface",
      border: "--ai-text-frame-border-strength",
      fill: "--ai-text-frame-fill-strength",
      highlight: "--ai-text-frame-highlight-strength; --color-text-primary",
    },
    spacing: {
      content: "--ai-text-frame-copy-width; --spacing-xl; --spacing-lg",
      padding: "--space-action-panel; --space-dense-panel",
    },
    border: {
      shape: "--radius-panel",
      highlight: "--ai-text-frame-highlight-width",
    },
    motion: { cycle: "--ai-text-frame-cycle" },
    elevation: {
      outer: "--ai-text-frame-glow-radius; --ai-text-frame-glow-strength",
      inner: "--ai-text-frame-inset-radius; --ai-text-frame-inset-strength",
    },
  },
  aiHints: {
    priority: "high",
    keywords: [
      "AI",
      "summary",
      "prose",
      "gold",
      "glow",
      "border",
      "reading",
      "text width",
    ],
    selectionCriteria: {
      reading:
        "Use for prepared AI prose needing a distinct review surface. Keep the page itself full width; only this reading block fits its content.",
    },
    usage: {
      useCases: ["Season onboarding AI summary", "Review of prepared AI text"],
      commonPatterns: [
        {
          name: "Reviewable summary",
          composition:
            "An accessible heading, AiTextFrame containing prose and citations, an adjacent pause Button, and feature-owned approval/correction actions.",
        },
      ],
      antiPatterns: [
        {
          scenario: "Use the glow as a busy indicator or proof of accuracy.",
          reason:
            "The motion is decorative and continues while reading completed text.",
          alternative:
            "Use LoadingIndicator for pending operations and explicit citations for evidence.",
        },
        {
          scenario:
            "Stretch the frame across the screen or copy its CSS into a feature.",
          reason:
            "The approved frame covers the text column and has one shared owner.",
          alternative:
            "Use AiTextFrame with its default content width and shared tokens.",
        },
        {
          scenario:
            "Animate without a pause control or despite reduced motion.",
          reason: "Nonessential reading motion must remain optional.",
          alternative:
            "Provide a pause/play Button, or set paused to true for a static surface.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
