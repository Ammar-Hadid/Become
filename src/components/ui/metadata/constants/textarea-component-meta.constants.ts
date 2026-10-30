import type { ComponentMeta } from "../types/component-meta.types";

export const textareaComponentMeta = {
  component: {
    name: "Textarea",
    category: "atoms",
    type: "input",
    description:
      "Owner-approved multiline underline textarea with Featured and Body variants, native content growth and internal scrolling. Manual resizing is disabled. Replaces the former boxed shared textarea.",
    path: "src/components/ui/forms/textarea.component.tsx",
  },
  props: {
    variant: {
      type: '"featured" | "body"',
      required: false,
      defaultValue: "body",
      values: ["featured", "body"],
      description:
        "Featured for defining long-text entries; Body for everyday writing.",
    },
    size: {
      type: '"sm" | "md" | "lg"',
      required: false,
      defaultValue: "sm",
      values: ["sm", "md", "lg"],
      description:
        "Backward-compatible minimum writing space: 3, 5 or 7 lines. Explicit rows takes precedence.",
    },
    rows: {
      type: "number",
      required: false,
      description:
        "Minimum writing lines, not a fixed height. Defaults to the selected size.",
    },
    label: {
      type: "string",
      required: false,
      description:
        "Associated visible label. When omitted, supply an external label or aria-label.",
    },
    help: {
      type: "string",
      required: false,
      description: "Supporting text associated through aria-describedby.",
    },
    error: {
      type: "string",
      required: false,
      description:
        "Feature-owned error; marks the field invalid and associates an alert.",
    },
    value: {
      type: "string | number | readonly string[]",
      required: false,
      description: "Controlled content; the feature owns edits and saving.",
    },
    defaultValue: {
      type: "string | number | readonly string[]",
      required: false,
      description:
        "Initial uncontrolled content; native editing and form reset are preserved.",
    },
    readOnly: {
      type: "boolean",
      required: false,
      defaultValue: "false",
      description: "Selectable, locked content with a dashed underline.",
    },
    disabled: {
      type: "boolean",
      required: false,
      defaultValue: "false",
      description: "Native disabled interaction with approved reduced opacity.",
    },
    ref: {
      type: "Ref<HTMLTextAreaElement>",
      required: false,
      description:
        "Ref to the native textarea for focus and validation recovery.",
    },
    nativeProps: {
      type: "ComponentPropsWithRef<textarea>",
      required: false,
      description:
        "Preserves id, name, required, maxlength, wrap, autocomplete, handlers, styles and ARIA attributes.",
    },
  },
  variants: {
    axes: {
      variant: ["featured", "body"],
      size: ["sm", "md", "lg"],
      state: ["empty", "filled", "focused", "invalid", "read-only", "disabled"],
    },
    purpose: {
      "variant.featured":
        "Larger paragraph text and uppercase tracked labels for onboarding and defining entries.",
      "variant.body":
        "Regular form typography for settings, dashboard questions, notes and corrections.",
      "size.sm": "Three minimum writing lines.",
      "size.md": "Five minimum writing lines.",
      "size.lg": "Seven minimum writing lines.",
      "state.empty": "Placeholder invites writing without replacing the label.",
      "state.filled":
        "Paragraphs wrap and grow naturally up to the shared height limit.",
      "state.focused":
        "Approved focus underline and caret, without an extra border or halo.",
      "state.invalid":
        "Danger underline with the associated feature-owned error.",
      "state.read-only": "Selectable locked content with a dashed underline.",
      "state.disabled": "Unavailable native control with reduced opacity.",
    },
  },
  relationships: {
    requires: ["FieldLabel", "FieldHelp", "FieldError"],
    commonPartners: ["Input", "Button", "RecordForm"],
    exposesState: ["focus", "value", "invalid", "disabled", "readOnly"],
    role: "Native multiline textarea. The feature owns data, validation, persistence and AI actions.",
    keyboardSupport:
      "Enter inserts a line break, Tab moves to the next control; native selection, editing and form reset. No manual resizing.",
    screenReader:
      "Associated label or accessible name, helper/error descriptions and aria-invalid. Ref targets the native control.",
  },
  tokens: {
    color: {
      text: "--field-text",
      focus: "--field-focus-color",
      error: "--field-error-color",
      placeholder: "--field-placeholder",
      selection: "--color-primary; --color-on-primary",
    },
    spacing: {
      body: "--input-body-padding-block",
      featured: "--input-featured-padding-block",
      label: "--input-label-gap",
      growthLimit: "--textarea-max-height",
    },
    typography: {
      body: "--input-body-size; --input-body-mobile-size; --text-body--line-height",
      featured:
        "--input-featured-size; --input-featured-leading; --input-featured-tracking",
      label: "--text-label; --text-overline",
    },
    border: {
      underline: "--field-border-width; --field-edge-rest; --field-edge-hover",
    },
    motion: { focus: "--motion-control-duration; --motion-control-ease" },
  },
  aiHints: {
    priority: "high",
    keywords: [
      "textarea",
      "paragraphs",
      "multiline",
      "underline",
      "featured",
      "body",
      "no resize",
      "auto grow",
    ],
    selectionCriteria: {
      featured:
        "Use for substantial defining text such as Season visual direction.",
      body: "Use for ordinary notes, questions and corrections; retain single-line Input for short names and identifiers.",
    },
    usage: {
      useCases: [
        "Season visual direction",
        "Settings image intent",
        "Dashboard C.O.T.S questions",
        "AI correction requests",
        "Character source notes",
      ],
      commonPatterns: [
        {
          name: "Defining paragraph",
          composition:
            'Textarea variant="featured" with label, followed by shared Button.',
        },
        {
          name: "Everyday writing",
          composition:
            'Textarea variant="body" with label/help/error or existing external label; preserve feature-owned save.',
        },
      ],
      antiPatterns: [
        {
          scenario:
            "Recreate boxed textarea styling or a resize handle inside a feature.",
          reason: "Competes with the approved shared presentation.",
          alternative: "Use Textarea and shared tokens.",
        },
        {
          scenario:
            "Use Input for substantial prose or replace a rich-text editor with Textarea.",
          reason:
            "Single-line input cannot express paragraphs; rich-text editing has separate approved behavior.",
          alternative:
            "Choose Textarea for plain paragraphs and preserve the shared document editor for formatted documents.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
