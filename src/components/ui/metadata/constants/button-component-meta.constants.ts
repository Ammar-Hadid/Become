import type { ComponentMeta } from "../types/component-meta.types";

export const buttonComponentMeta = {
  component: {
    name: "Button",
    category: "atoms",
    type: "interactive",
    description:
      "Shared primary/secondary/ghost/danger button with owner-approved primary confirmation feedback: green fill, icon-to-check handoff and stable label geometry. Success feedback approved 12 October 2026. Within Workspace, the owner-authorized 27 October redesign supplies rounded controls, 44px default height, 48px large height, 10px icon gap and domain accent via scoped tokens; protected defaults stay unchanged.",
    path: "src/components/ui/buttons/button.component.tsx",
  },
  props: {
    variant: {
      type: '"primary" | "secondary" | "ghost" | "danger"',
      required: false,
      defaultValue: "primary",
      values: ["primary", "secondary", "ghost", "danger"],
      description:
        "Action role. Confirmation feedback applies only to primary.",
    },
    size: {
      type: '"sm" | "md" | "lg" | "icon"',
      required: false,
      defaultValue: "md",
      values: ["sm", "md", "lg", "icon"],
      description:
        "Existing compact approved sizes. Text feedback is intended for labeled buttons.",
    },
    feedback: {
      type: 'ButtonFeedback { state: "idle" | "pending" | "success"; label: string; icon: ReactNode; pendingLabel?: string; successLabel?: string }',
      required: false,
      description:
        "Controlled primary-button state. Renders an accessible current label, fixed-size icon slot and overlapping labels to preserve geometry. Defaults pendingLabel to Working… and successLabel to Done. Without feedback, native children render unchanged.",
    },
    onClick: {
      type: "MouseEventHandler<HTMLButtonElement>",
      required: false,
      description:
        "Caller executes and confirms the operation. Button does not access clipboard, reset feedback, retry or save.",
    },
    nativeProps: {
      type: "ComponentPropsWithRef<button>",
      required: false,
      description:
        "Preserves native button type, ref, handlers, disabled and other accessibility attributes. Feedback owns the current accessible label and busy state.",
    },
  },
  variants: {
    axes: {
      variant: ["primary", "secondary", "ghost", "danger"],
      feedback: ["none", "idle", "pending", "success"],
    },
    purpose: {
      "variant.primary":
        "Prominent action, optionally with confirmed-result feedback.",
      "variant.secondary": "Supporting action.",
      "variant.ghost": "Quiet action.",
      "variant.danger": "Destructive action.",
      "feedback.none": "Existing native button children.",
      "feedback.idle": "Normal primary fill, original icon and action label.",
      "feedback.pending":
        "Caller-provided pending label and aria-busy; feature guards duplicate actions.",
      "feedback.success":
        "Semantic success green, checkmark and confirmed label; feature owns duration and reset.",
    },
    invalidCombinations: [
      {
        axes: {
          variant: "secondary|ghost|danger",
          feedback: "idle|pending|success",
        },
        reason:
          "The approved feedback treatment is primary-only. Other variants ignore feedback and retain normal children.",
      },
    ],
  },
  relationships: {
    commonPartners: ["Drawer", "Card"],
    exposesState: ["data-feedback", "aria-busy", "current accessible label"],
    role: "Stateless action presentation. Copy success means clipboard confirmation only, not image generation, external usage or Season approval.",
    keyboardSupport:
      "Native Tab, Enter and Space. Feature prevents duplicate pending work while preserving focus.",
    screenReader:
      "Feedback exposes the current action label; decorative icons and reserved labels are aria-hidden. Caller supplies a polite atomic status region for confirmed success or actionable failure.",
  },
  tokens: {
    color: {
      success:
        "--button-success-rest; --button-success-hover; --button-success-pressed; --button-success-foreground",
    },
    spacing: {
      geometry:
        "--button-height-md; --button-padding-inline; --button-gap; --button-icon-glyph-size",
    },
    motion: {
      transition:
        "--motion-control-duration; --motion-control-ease; --button-feedback-travel",
    },
    border: {
      shape: "--button-radius; --button-border-width",
      focus: "--button-focus-color; --button-focus-width",
    },
  },
  aiHints: {
    priority: "high",
    keywords: [
      "button",
      "copy",
      "success",
      "confirmation",
      "green",
      "checkmark",
      "clipboard",
    ],
    selectionCriteria: {
      success:
        "Use primary feedback only after the owning operation confirms success. Preserve the approved animation and geometry.",
    },
    usage: {
      useCases: ["Copy image prompt", "Confirmed primary action"],
      commonPatterns: [
        {
          name: "Copy confirmation",
          composition:
            "Feature-owned clipboard write and two-second confirmation; Button feedback with Copy prompt / Copying… / Copied and Copy icon; polite status and failure fallback.",
        },
      ],
      antiPatterns: [
        {
          scenario: "Set success on click before the operation resolves.",
          reason: "Misrepresents failure or pending work.",
          alternative:
            "Await confirmed result; retain retry/manual-copy access after rejection.",
        },
        {
          scenario: "Put clipboard execution or a reset timer inside Button.",
          reason: "Presentation would own feature behavior.",
          alternative: "Use feature-owned state and workflow timing.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
