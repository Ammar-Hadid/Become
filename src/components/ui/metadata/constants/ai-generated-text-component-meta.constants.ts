import type { ComponentMeta } from "../types/component-meta.types";

export const aiGeneratedTextComponentMeta = {
  component: {
    name: "AiGeneratedText",
    category: "molecules",
    type: "display",
    description:
      "Owner-approved Living Ink for longer AI-generated text and paragraphs. Words emerge through a primary-gold glow trail and settle into readable prose. Paragraphs reveal strictly in order. Approved 11 October 2026 after the sequential and gold-trail refinements.",
    path: "src/components/ui/ai-generated-text/ai-generated-text.component.tsx",
  },
  props: {
    text: {
      type: "string",
      required: true,
      description:
        "Complete prepared prose; blank lines separate paragraphs. Changing text resets the reveal. The feature owns wording and provenance; this component makes no model calls.",
    },
    paused: {
      type: "boolean",
      required: false,
      defaultValue: "false",
      description:
        "Pauses the current word animations without losing progress. Provide an adjacent shared pause/resume Button when animated.",
    },
    staticText: {
      type: "boolean",
      required: false,
      defaultValue: "false",
      description:
        "Displays complete plain prose immediately. Device reduced motion automatically selects this behavior.",
    },
    nativeProps: {
      type: "HTMLAttributes<HTMLDivElement>",
      required: false,
      description:
        "Native id, className and accessibility attributes. Do not use aria-busy or a token-by-token live region for this prepared-text reveal.",
    },
  },
  variants: {
    axes: {
      state: ["pending", "revealing", "paused", "complete"],
      motion: ["standard", "static", "reduced"],
    },
    purpose: {
      "state.pending":
        "Later paragraphs retain their completed layout and wait for the preceding paragraph to finish.",
      "state.revealing":
        "Only the current paragraph reveals; words emerge with a gold glow and settle to the normal text color.",
      "state.paused":
        "Explicit pause, offscreen content and hidden tabs preserve the current progress.",
      "state.complete":
        "Remove animation spans and render plain, selectable paragraph text.",
      "motion.standard":
        "Approved word cadence and gold trail, strictly sequential paragraphs.",
      "motion.static":
        "Full prose without a reveal, suitable for static reading.",
      "motion.reduced":
        "Immediately show the complete plain text, including when the device preference changes during a reveal.",
    },
  },
  relationships: {
    commonPartners: ["AiTextFrame", "Button"],
    exposesState: [
      "data-complete",
      "paragraph data-pending",
      "paragraph data-reveal",
      "paragraph data-running",
    ],
    role: "Prepared long AI-generated prose and paragraphs, distinct from C.O.T.S. speech and generation/loading state.",
    keyboardSupport:
      "Native selection and reading. Supply a shared keyboard-accessible pause/resume Button; reveal never delays navigation, correction or approval.",
    screenReader:
      "Each paragraph exposes its complete text once while animated words are aria-hidden. No live-region stream. Server/no-JavaScript rendering remains readable; reduced motion shows all text immediately.",
  },
  tokens: {
    color: {
      trail: "--color-primary",
      settled: "--color-text-primary",
      blend:
        "--ai-generated-text-soft-strength; --ai-generated-text-light-strength; --ai-generated-text-settle-tint; --ai-generated-text-trail-strength",
    },
    spacing: { paragraphs: "--spacing-lg" },
    typography: { prose: "type-body-lg; --ai-generated-text-copy-width" },
    motion: {
      word: "--ai-generated-text-duration; --ai-generated-text-word-step; --ai-generated-text-delay-cap",
    },
    elevation: {
      light:
        "--ai-generated-text-light-radius; --ai-generated-text-soft-radius",
    },
  },
  aiHints: {
    priority: "high",
    keywords: [
      "AI-generated text",
      "long prose",
      "paragraphs",
      "Living Ink",
      "summary",
      "sequential reveal",
      "gold trail",
    ],
    selectionCriteria: {
      choose:
        "Use for longer AI-generated summaries, briefs, reports and paragraphs.",
      avoid:
        "AiTypingText / Terminal Prompt is solely for C.O.T.S. speech. Pending generation uses LoadingIndicator.",
    },
    usage: {
      useCases: [
        "AI-prepared Season summary",
        "Long AI-generated brief",
        "Prepared AI report paragraphs",
      ],
      commonPatterns: [
        {
          name: "Reviewable generated summary",
          composition:
            "AiTextFrame with feature-owned heading and identity, AiGeneratedText, compact source links, and an adjacent Button pausing both text and border motion. Feature-owned approval remains available immediately.",
        },
      ],
      antiPatterns: [
        {
          scenario: "Animate all paragraphs simultaneously.",
          reason:
            "The approved reading sequence is first paragraph, then second, then third.",
          alternative:
            "Pass the complete text once with blank-line paragraph breaks.",
        },
        {
          scenario:
            "Use this animation for C.O.T.S. conversation or daily messages.",
          reason:
            "C.O.T.S. speech has its own approved Terminal Prompt treatment.",
          alternative: "Use AiTypingText for C.O.T.S. speech.",
        },
        {
          scenario:
            "Treat the reveal as model activity, evidence of accuracy, or an approval gate.",
          reason:
            "This component reveals already-prepared text and does not generate or verify it.",
          alternative:
            "Use LoadingIndicator during real work, supply citations, and keep review actions available.",
        },
        {
          scenario:
            "Duplicate motion CSS in a feature or omit pause/reduced-motion support.",
          reason:
            "The shared component owns the approved cadence and accessibility behavior.",
          alternative:
            "Reuse AiGeneratedText and an adjacent shared pause/resume Button.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
