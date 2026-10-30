import type { ComponentMeta } from "../types/component-meta.types";

export const featuredCardComponentMeta = {
  component: {
    name: "FeaturedCard",
    category: "molecules",
    type: "container",
    description:
      "Owner-approved floating glass card for AI and featured content, with a glowing primary-gold beveled rim, offset shadow and mirrored left/right facings. Both facings approved 15 October 2026.",
    path: "src/components/ui/featured-card/featured-card.component.tsx",
  },
  props: {
    facing: {
      type: '"left" | "right"',
      required: false,
      defaultValue: "left",
      values: ["left", "right"],
      description:
        "Mirrors perspective, depth, rim lighting and reflection without mirroring the content. One component and content tree serve both states.",
    },
    paused: {
      type: "boolean",
      required: false,
      defaultValue: "false",
      description:
        "Freeze the decorative rim. Supply a nearby pause/resume control; share that state with other continuous effects on the page.",
    },
    as: {
      type: '"section" | "article" | "div"',
      required: false,
      defaultValue: "section",
      description:
        "Semantic element for the inner Card. Associate section/article headings through aria-labelledby.",
    },
    spacing: {
      type: '"overview" | "dense" | "action"',
      required: false,
      defaultValue: "overview",
      description:
        "Shared Card spacing; phones use the approved dense padding.",
    },
    children: {
      type: "ReactNode",
      required: false,
      description:
        "Feature-owned content, identity, data, operation states and actions.",
    },
    className: {
      type: "string",
      required: false,
      description:
        "Layout class on the outer floating wrapper, for grid placement or feature-owned sizing.",
    },
    nativeProps: {
      type: "Omit<ComponentProps<typeof Card>, 'material'>",
      required: false,
      description:
        "Remaining native Card attributes, including id, style and ARIA, are forwarded to the semantic inner surface. The approved material is fixed.",
    },
  },
  variants: {
    axes: {
      facing: ["left", "right"],
      motion: ["animated", "paused", "reduced-motion"],
    },
    purpose: {
      "facing.left":
        "Left-facing perspective with its illuminated depth on the right; suits the right-hand Season recap.",
      "facing.right":
        "Mirrored perspective, bevel and lighting for the opposite composition.",
      "motion.animated":
        "Slow twelve-second rim highlight while visible in the foreground; text stays stationary.",
      "motion.paused":
        "Freeze the rim when paused, offscreen or in a hidden tab.",
      "motion.reduced-motion":
        "Static rim and immediate facing changes; no spatial transition.",
    },
  },
  relationships: {
    commonPartners: ["Button", "AmbientLight", "AiGeneratedText"],
    exposesState: ["data-facing", "data-motion"],
    role: "Presentation surface for AI/featured cards and the activation candidate recap. Decoration never signifies generation, approval or successful activation.",
    keyboardSupport:
      "Noninteractive container; child controls retain native keyboard behavior. Provide an accessible pause/resume Button or set paused=true.",
    screenReader:
      "Decorative depth is aria-hidden. Card preserves its native landmark, heading associations and child semantics without busy or live announcements.",
  },
  tokens: {
    color: {
      accent: "--featured-card-accent",
      face: "--featured-card-face-start; --featured-card-face-end",
      rim: "--featured-card-highlight; --featured-card-highlight-secondary; --featured-card-border-strength",
      reflection: "--featured-card-reflection-strength",
    },
    spacing: {
      padding:
        "--space-overview-panel; --space-dense-panel; --space-action-panel",
      content: "--spacing-2xl; --spacing-xl",
    },
    border: { radius: "--radius-panel", rim: "--featured-card-rim-width" },
    elevation: {
      perspective: "--featured-card-perspective; --featured-card-tilt",
      shadow:
        "--featured-card-shadow; --featured-card-contact-offset; --featured-card-contact-height; --featured-card-contact-color; --featured-card-contact-blur",
      glass: "--featured-card-glass-blur",
    },
    motion: {
      cycle: "--featured-card-cycle",
      transition: "--motion-surface-duration; --motion-surface-ease",
      reduced: "prefers-reduced-motion: reduce",
    },
  },
  aiHints: {
    priority: "high",
    keywords: [
      "featured card",
      "AI card",
      "floating glass",
      "glowing border",
      "Season recap",
      "left facing",
      "right facing",
    ],
    selectionCriteria: {
      choose:
        "Use for an intentionally featured AI or recap surface with the approved floating glass treatment. Keep ordinary lists and dashboard cards on Card.",
    },
    usage: {
      useCases: ["AI/featured content", "Activation candidate recap"],
      commonPatterns: [
        {
          name: "Pausable Season recap",
          composition:
            "FeaturedCard facing='left' paused={pagePaused}, containing feature-owned identity and divided recap groups. The same pagePaused controls Gold Drift.",
        },
      ],
      antiPatterns: [
        {
          scenario:
            "Create separate left and right components or copy the material CSS into a feature.",
          reason: "Both facings are one approved treatment.",
          alternative:
            "Use FeaturedCard.facing and owner-editable shared tokens.",
        },
        {
          scenario: "Use the glowing rim as a generation or success signal.",
          reason: "The rim is decorative and independent of operations.",
          alternative:
            "Use real operation states and shared loading or feedback components.",
        },
        {
          scenario:
            "Animate continuously without pause or replace long AI text with C.O.T.S. typing.",
          reason: "Motion must be optional and text roles remain distinct.",
          alternative:
            "Pass a shared paused state; use AiGeneratedText for long prose and AiTypingText only for C.O.T.S. speech.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
