import { workspaceComponentMeta } from "./workspace-component-meta.constants";
import { seasonPreparationComponentMeta } from "./season-preparation-component-meta.constants";
import {
  recognizedCharacterComponentMeta,
  versionDrawerComponentMeta,
} from "./recognized-character-component-meta.constants";
import {
  stepIndicatorComponentMeta,
  seasonRitualLayoutComponentMeta,
} from "./season-opening-component-meta.constants";
import { featuredCardComponentMeta } from "./featured-card-component-meta.constants";
import { aiGeneratedTextComponentMeta } from "./ai-generated-text-component-meta.constants";
import type { ComponentMeta } from "../types/component-meta.types";
import { textareaComponentMeta } from "./textarea-component-meta.constants";
import { aiTextFrameComponentMeta } from "./ai-text-frame-component-meta.constants";
import { ambientLightComponentMeta } from "./ambient-light-component-meta.constants";
import { buttonComponentMeta } from "./button-component-meta.constants";
import { artworkUploadComponentMeta } from "./artwork-upload-component-meta.constants";

/**
 * Explicit approvals in this conversation only. Paths point to the real shared
 * implementation; the Pulse Pin and rail-motion entries describe approved
 * nonvisual treatments, not additional React components.
 */
export const threadApprovedComponentMeta = [
  workspaceComponentMeta,
  seasonPreparationComponentMeta,
  recognizedCharacterComponentMeta,
  versionDrawerComponentMeta,
  stepIndicatorComponentMeta,
  seasonRitualLayoutComponentMeta,
  featuredCardComponentMeta,
  artworkUploadComponentMeta,
  buttonComponentMeta,
  ambientLightComponentMeta,
  aiGeneratedTextComponentMeta,
  aiTextFrameComponentMeta,
  textareaComponentMeta,
  {
    component: {
      name: "Input",
      category: "atoms",
      type: "input",
      description:
        "Approved card-free underline input with Featured and Body variants, replacing the former boxed shared input.",
      path: "src/components/ui/forms/input.component.tsx",
    },
    props: {
      variant: {
        type: '"featured" | "body"',
        required: false,
        defaultValue: "body",
        values: ["featured", "body"],
        description:
          "Featured for defining entries such as onboarding; Body for everyday forms.",
      },
      label: {
        type: "string",
        required: false,
        description:
          "Visible associated label. When omitted, supply an external label or aria-label.",
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
          "Feature-owned validation message; marks invalid and associates an alert.",
      },
      type: {
        type: "HTMLInputTypeAttribute",
        required: false,
        defaultValue: "text",
        description:
          "Native text, email, URL, password, search or number behavior.",
      },
      value: {
        type: "string | number | readonly string[]",
        required: false,
        description: "Controlled value; caller owns editing and persistence.",
      },
      defaultValue: {
        type: "string | number | readonly string[]",
        required: false,
        description: "Initial value for an uncontrolled native input.",
      },
      disabled: {
        type: "boolean",
        required: false,
        defaultValue: "false",
        description: "Disables native interaction and dims the control.",
      },
      readOnly: {
        type: "boolean",
        required: false,
        defaultValue: "false",
        description:
          "Preserves selection and focus while preventing edits; dashed underline.",
      },
      ref: {
        type: "Ref<HTMLInputElement>",
        required: false,
        description:
          "Native input ref for validation recovery and deliberate focus.",
      },
      nativeProps: {
        type: "ComponentPropsWithRef<input>",
        required: false,
        description:
          "Preserves id, name, autocomplete, required, min/max, step, maxlength, native handlers and ARIA attributes.",
      },
    },
    variants: {
      axes: {
        variant: ["featured", "body"],
        state: [
          "empty",
          "filled",
          "focused",
          "invalid",
          "read-only",
          "disabled",
        ],
      },
      purpose: {
        "variant.featured":
          "Large entry text and tracked uppercase label for onboarding and defining moments.",
        "variant.body":
          "Compact ordinary form text and normal label, default for Nexo settings and workspace fields.",
        "state.empty":
          "Optional placeholder invites an entry without replacing the label.",
        "state.filled": "Entered value remains the focal content.",
        "state.focused":
          "Gold underline and caret show editing focus immediately.",
        "state.invalid":
          "Danger underline and associated feature-owned error message.",
        "state.read-only": "Selectable, locked value with a dashed underline.",
        "state.disabled": "Unavailable native control with reduced opacity.",
      },
    },
    relationships: {
      requires: ["FieldLabel", "FieldHelp", "FieldError"],
      commonPartners: ["Button", "RecordForm"],
      exposesState: ["focus", "value", "invalid", "disabled", "readOnly"],
      role: "Native single-line input; feature owns validation, data, save actions and provider calls.",
      keyboardSupport:
        "Native Tab navigation, editing, selection and type-specific behavior; ref targets the input for validation recovery.",
      screenReader:
        "Associated visible label or caller-provided accessible name; helper/error descriptions and aria-invalid. Hidden and file controls remain native specialized controls.",
    },
    tokens: {
      color: {
        text: "--field-text",
        focus: "--field-focus-color",
        error: "--field-error-color",
        placeholder: "--field-placeholder",
      },
      spacing: {
        body: "--input-body-height; --input-body-padding-block",
        featured: "--input-featured-height; --input-featured-padding-block",
        label: "--input-label-gap",
      },
      typography: {
        body: "--input-body-size; --input-body-mobile-size",
        featured:
          "--input-featured-size; --input-featured-tracking; --input-featured-leading",
        label: "--text-label; --text-overline",
      },
      border: {
        underline:
          "--field-border-width; --field-edge-rest; --field-edge-hover",
      },
      motion: { focus: "--motion-control-duration; --motion-control-ease" },
    },
    aiHints: {
      priority: "high",
      keywords: [
        "input",
        "underline",
        "featured",
        "body",
        "form",
        "onboarding",
      ],
      selectionCriteria: {
        featured:
          "Use for an important first entry such as character identification.",
        body: "Use for ordinary text, numeric, credential and search fields in forms.",
      },
      usage: {
        useCases: [
          "Season character selection",
          "Nexo credentials and profiles",
          "Source/canon forms",
          "Image Direction variables",
        ],
        commonPatterns: [
          {
            name: "Defining entry",
            composition:
              'Input variant="featured" with label, followed by shared Button.',
          },
          {
            name: "Everyday field",
            composition:
              'Input variant="body" with label, optional help/error, native validation and feature-owned save.',
          },
        ],
        antiPatterns: [
          {
            scenario:
              "Redraw a boxed input or duplicate underline CSS inside a feature.",
            reason: "Creates competing presentation owners.",
            alternative: "Use Input and edit approved tokens.",
          },
          {
            scenario: "Use the control without an accessible name.",
            reason: "A placeholder is not a label.",
            alternative:
              "Supply label, an external associated label, or aria-label.",
          },
        ],
      },
    },
  },
  {
    component: {
      name: "CharacterConfirmation",
      category: "organisms",
      type: "interactive",
      description:
        "Approved character identity confirmation with a dark, centered source-image carousel and explicit identity/version actions.",
      path: "src/components/ui/character-confirmation/character-confirmation.component.tsx",
    },
    props: {
      match: {
        type: "CharacterConfirmationMatch | null",
        required: true,
        description:
          "Retrieved name, work, adaptation and source-linked original images; never fabricated artwork.",
      },
      loading: {
        type: "boolean",
        required: false,
        defaultValue: "false",
        description: "Shows the shared pending indicator during lookup.",
      },
      busy: {
        type: "boolean",
        required: false,
        defaultValue: "false",
        description: "Disables confirmation actions while saving.",
      },
      aiUsed: {
        type: "boolean",
        required: false,
        defaultValue: "false",
        description: "Labels only an actual connected AI identification.",
      },
      notice: {
        type: "string | null",
        required: false,
        description:
          "Truthful lookup or preview status, rendered as immediately readable text; Terminal Prompt is reserved for C.O.T.S. speech.",
      },
      actions: {
        type: "ReactNode",
        required: false,
        description:
          "Optional feature-owned shared buttons in the approved action layout; the feature owns callbacks, refs, disabled state and feedback.",
      },
      emptyImageMessage: {
        type: "ReactNode",
        required: false,
        description:
          "Optional feature-owned explanation or retry action when no picture is available.",
      },
      footer: {
        type: "ReactNode",
        required: false,
        description:
          "Optional feature-owned caption; undefined keeps the default, null omits it. Does not approve candidate compositions.",
      },
      onConfirm: {
        type: "() => void",
        required: true,
        description: "Owner persists the chosen identity.",
      },
      onDifferentVersion: {
        type: "() => void",
        required: true,
        description: "Owner opens adaptation selection.",
      },
      onWrongCharacter: {
        type: "() => void",
        required: true,
        description: "Owner returns to identification.",
      },
    },
    variants: {
      axes: {
        state: ["loading", "match", "no-match"],
        images: ["none", "one", "multiple"],
        attribution: ["catalogue", "connected-ai"],
      },
      purpose: {
        "state.loading":
          "Shared progress while retrieving identity and images.",
        "state.match": "Ask the user to confirm identity and adaptation.",
        "state.no-match": "Invite refinement or authentic manual references.",
        "images.none": "Keep identity confirmation usable without imagery.",
        "images.one": "Centered, contained source image and citation.",
        "images.multiple":
          "Manual carousel with source attribution and image count.",
        "attribution.catalogue":
          "Plain lookup status with no claim of connected AI.",
        "attribution.connected-ai":
          "AI label with immediately readable status text for an actual model result.",
      },
    },
    relationships: {
      requires: ["Card", "Button", "Badge", "IconFrame", "LoadingIndicator"],
      exposesState: ["busy", "current image", "retrieved identity"],
      role: "Character identity confirmation; the feature owns lookup and persistence.",
      keyboardSupport:
        "Previous/next buttons and Left/Right on the carousel; no autoplay. Horizontal swipe changes images.",
      screenReader:
        "Named carousel, image alt text, source link, live image count and explicit confirmation actions.",
    },
    tokens: {
      color: { image: "--color-background", text: "--color-text-primary" },
      spacing: {
        image: "--character-confirmation-image-height",
        content: "--spacing-lg; --spacing-sm; --spacing-md",
      },
      border: { focus: "--button-focus-width; --color-primary" },
    },
    aiHints: {
      priority: "high",
      keywords: [
        "character identification",
        "source images",
        "confirmation",
        "carousel",
      ],
      selectionCriteria: {
        choose: "A retrieved character and adaptation need user confirmation.",
        data: "Supply existing source images and their exact citation links.",
      },
      usage: {
        useCases: [
          "Season character identification",
          "Isolated approval preview",
        ],
        commonPatterns: [
          {
            name: "Retrieved character",
            composition:
              "Feature resolves records; CharacterConfirmation presents the selected match and images.",
          },
        ],
        antiPatterns: [
          {
            scenario: "Use generated lookalikes as identity evidence.",
            reason: "They do not establish which real character was selected.",
            alternative:
              "Use retrieved authentic originals or request an upload.",
          },
        ],
      },
    },
  },
  {
    component: {
      name: "CharacterBanner",
      category: "organisms",
      type: "display",
      description:
        "Responsive, edge-to-edge Season character artwork with an integrated crown pill, title, source, optional verified quote, and optional right-side line.",
      path: "src/components/ui/character-banner/character-banner.component.tsx",
      figma: { nodeId: null },
    },
    props: {
      content: {
        type: "CharacterBannerContent",
        required: true,
        description:
          "Character name and source plus optional desktop/phone artwork, alt text, quote, attribution, and rightLine. Season-owned approved revisions supply these values.",
      },
      headingLevel: {
        type: "1 | 2",
        required: false,
        defaultValue: "2",
        values: ["1", "2"],
        description:
          "Use h1 only when the banner is the page's primary heading.",
      },
    },
    variants: {
      axes: {
        viewport: ["desktop", "phone"],
        artwork: ["approved-image", "fallback"],
        copy: ["identity-only", "with-quote", "with-right-line", "full"],
      },
      purpose: {
        "viewport.desktop":
          "Wide composition with copy on the left and a short line on the right.",
        "viewport.phone":
          "Phone composition protects the face and rearranges the copy below it.",
        "artwork.approved-image":
          "Use the saved desktop image and, when present, the separately composed phone image.",
        "artwork.fallback":
          "Keep identity and copy readable when no image exists or loading fails.",
        "copy.identity-only":
          "Name and source remain usable before optional copy is approved.",
        "copy.with-quote": "Show a curated, attributed quote when supplied.",
        "copy.with-right-line":
          "Show the character-specific short line when supplied.",
        "copy.full": "Show both optional pieces of approved copy.",
      },
    },
    relationships: {
      commonPartners: ["CharacterAvatarEditor", "CharacterStepRail"],
      exposesState: ["artwork available", "artwork fallback"],
      role: "Labeled section containing a semantic h1 or h2, source text, and an optional blockquote.",
      keyboardSupport: "No direct interaction or keyboard behavior.",
      screenReader:
        "Announces the Character identity section and artwork alt text; decorative crown is hidden. The fallback announces unavailable artwork.",
    },
    tokens: {
      color: {
        overlay:
          "--color-background; --character-banner-overlay-left; --character-banner-overlay-mid; --character-banner-overlay-center; --character-banner-overlay-right; --character-banner-overlay-bottom; --character-banner-phone-overlay-bottom; --character-banner-phone-overlay-mid; --character-banner-phone-overlay-side",
        crown:
          "--color-primary; --character-banner-badge-fill; --character-banner-badge-edge; --character-banner-badge-glow",
        text: "--color-text-primary; --color-text-secondary",
      },
      spacing: {
        card: "--character-banner-padding; --character-banner-height; --character-banner-phone-height",
        copy: "--character-banner-copy-width; --character-banner-phone-copy-clearance; --spacing-sm; --spacing-lg",
      },
      typography: {
        title:
          "--text-banner-title; --text-banner-title--font-family; --text-banner-title--font-weight; --text-banner-title--letter-spacing; --text-banner-title--line-height; --character-banner-phone-title",
        quote:
          "--character-banner-quote-size; --character-banner-quote-leading; --character-banner-quote-font-family; --character-banner-quote-font-weight; --character-banner-quote-font-style; --character-banner-phone-quote-size",
        line: "--character-banner-line-width; --character-banner-line-tracking; --character-banner-line-leading; --character-banner-phone-line-tracking; --character-banner-phone-line-leading",
      },
      border: {
        card: "--color-border; --radius-card",
        crown: "--character-banner-badge-radius; --character-banner-badge-edge",
        quote: "--character-banner-quote-rule",
      },
      elevation: {
        crown: "--character-banner-badge-glow; --character-banner-badge-blur",
      },
    },
    aiHints: {
      priority: "high",
      keywords: [
        "C.O.T.S.",
        "Season",
        "character banner",
        "crown",
        "quote",
        "responsive artwork",
      ],
      selectionCriteria: {
        choose:
          "A Season character needs the approved identity banner in staging or the Season library.",
        data: "Use the saved banner revision and its exact copy; never infer or silently select a quote.",
      },
      usage: {
        useCases: [
          "Banner & portrait step in Season opening",
          "Active Season library card",
          "Frozen Season archive banner",
        ],
        commonPatterns: [
          {
            name: "Approved Season banner",
            composition:
              "CharacterBanner receives Season-owned desktop/phone image URLs and approved quote/rightLine copy.",
          },
        ],
        antiPatterns: [
          {
            scenario: "Overlay text is baked into generated artwork.",
            reason:
              "Copy cannot adapt to viewport, accessibility, or later approved revisions.",
            alternative: "Keep artwork text-free and pass copy in content.",
          },
          {
            scenario: "A phone banner is made by cropping the desktop image.",
            reason: "The character's face and protected copy area may be lost.",
            alternative: "Supply a separately composed phoneSrc when approved.",
          },
        ],
      },
    },
  },
  {
    component: {
      name: "CharacterAvatarEditor",
      category: "organisms",
      type: "input",
      description:
        "Shared portrait-placement dialog for dragging or adjusting a circular crop, uploading a picture, and reverting to generated artwork.",
      path: "src/components/ui/character-avatar/character-avatar-editor.component.tsx",
      figma: { nodeId: null },
    },
    props: {
      name: {
        type: "string",
        required: true,
        description: "Character name in the dialog title and crop label.",
      },
      source: {
        type: "string",
        required: true,
        description: "Current portrait URL to edit.",
      },
      generatedSource: {
        type: "string",
        required: true,
        description: "Generated portrait URL restored by Use generated.",
      },
      placement: {
        type: "AvatarPlacement",
        required: true,
        description: "Current reversible x, y, and zoom crop.",
      },
      previewOnly: {
        type: "boolean",
        required: false,
        defaultValue: "false",
        description: "Marks a local approval preview; does not save a Season.",
      },
      persistenceHint: {
        type: "string",
        required: false,
        description: "Optional owning feature's truthful save guidance.",
      },
      onClose: {
        type: "() => void",
        required: true,
        description: "Closes the shared dialog without applying the draft.",
      },
      onApply: {
        type: "(source: string, placement: AvatarPlacement, file?: File) => void | boolean | Promise<void | boolean>",
        required: true,
        description:
          "Owning feature persists the image and crop; returning false displays a save error.",
      },
    },
    variants: {
      axes: {
        source: ["generated", "uploaded"],
        state: ["editing", "saving", "error"],
        viewport: ["desktop", "phone"],
      },
      purpose: {
        "source.generated":
          "Fine-tune the distinct approved generated portrait.",
        "source.uploaded":
          "Review and crop a manually supplied portrait in the same slot.",
        "state.editing":
          "Drag the preview or use zoom and position sliders before applying.",
        "state.saving":
          "Disable the footer cancel and apply actions while onApply is pending.",
        "state.error":
          "Show validation or persistence failure beside the controls.",
        "viewport.desktop":
          "Circular preview and controls appear side by side.",
        "viewport.phone": "Preview stacks above full-width controls.",
      },
    },
    relationships: {
      requires: ["Dialog", "Button", "FieldError"],
      commonPartners: ["CharacterBanner"],
      triggers: ["onClose", "onApply"],
      blocksWhen: [
        {
          when: "onApply is pending",
          effect: "Cancel and apply actions are disabled.",
        },
      ],
      exposesState: [
        "draft source",
        "draft crop",
        "upload error",
        "save pending",
      ],
      role: "Modal dialog with a labeled crop preview, native range inputs, upload control, and explicit apply/cancel actions.",
      keyboardSupport:
        "Dialog focus behavior is shared; zoom and x/y sliders are keyboard-operable, and upload/apply are buttons.",
      screenReader:
        "Dialog title names the character; the crop preview explains dragging and points to sliders; errors are rendered as FieldError.",
    },
    tokens: {
      color: {
        ring: "--color-primary",
        surface: "--color-surface-input",
        hint: "--color-text-primary; --color-background",
      },
      spacing: {
        layout: "--spacing-xl; --spacing-md; --spacing-sm",
        preview:
          "--character-avatar-preview-width; --character-avatar-phone-preview-width",
      },
      typography: { labels: "type-label", hint: "type-caption" },
      border: {
        dialog: "--character-avatar-dialog-width",
        crop: "--character-avatar-ring-width; --radius-control",
      },
      elevation: { crop: "--character-avatar-ring-glow-width" },
    },
    aiHints: {
      priority: "high",
      keywords: [
        "portrait",
        "profile picture",
        "avatar",
        "crop",
        "upload",
        "reframe",
      ],
      selectionCriteria: {
        choose:
          "The user must choose the visible circular portion of a character portrait.",
        persistence:
          "Pass a real onApply that saves the original image and reversible crop; this component does not persist them itself.",
      },
      usage: {
        useCases: [
          "Review generated PFP",
          "Upload a custom PFP",
          "Adjust an existing portrait crop",
        ],
        commonPatterns: [
          {
            name: "Season portrait adjustment",
            composition:
              "Open from the portrait; pass current source, generated source, placement, and Season-owned callbacks.",
          },
        ],
        antiPatterns: [
          {
            scenario: "Treat an object URL as a permanent saved portrait.",
            reason: "It disappears after refresh.",
            alternative:
              "Persist the uploaded file in onApply and keep its durable URL with the crop.",
          },
          {
            scenario: "Use drag as the only crop control.",
            reason: "It excludes keyboard users.",
            alternative: "Keep the zoom and fine-position sliders available.",
          },
        ],
      },
    },
  },
  {
    component: {
      name: "CharacterStepRail",
      category: "organisms",
      type: "navigation",
      description:
        "Wrapping workspace navigation with four desktop or two phone cards visible and one-step gesture movement; reused for Season onboarding and its five profile sections.",
      path: "src/components/ui/character-step-rail/character-step-rail.component.tsx",
      figma: { nodeId: null },
    },
    props: {
      steps: {
        type: "readonly CharacterStepRailItem<Id>[]",
        required: true,
        description:
          "Ordered stable IDs, labels, and details supplied by the owning workspace.",
      },
      selectedId: {
        type: "Id",
        required: true,
        description: "Controlled active step ID.",
      },
      onSelect: {
        type: "(id: Id) => void",
        required: true,
        description: "Updates the owning workspace's active step.",
      },
      ariaLabel: {
        type: "string",
        required: false,
        defaultValue: "Character profile sections",
        description: "Accessible navigation name for the owning workflow.",
      },
    },
    variants: {
      axes: {
        viewport: ["desktop-four", "compact-two"],
        input: ["click", "keyboard", "wheel", "touch"],
        motion: ["standard", "reduced"],
      },
      purpose: {
        "viewport.desktop-four":
          "Preserve four fixed-width cards in the visible desktop slot.",
        "viewport.compact-two":
          "Preserve two cards at smaller widths without horizontal page overflow.",
        "input.click":
          "Select a specific step and move it into the first slot with Pulse Pin.",
        "input.keyboard":
          "Arrow/Home/End selects and focuses a step with Pulse Pin.",
        "input.wheel":
          "One wheel gesture moves exactly one step and stays silent.",
        "input.touch":
          "One horizontal or vertical swipe moves exactly one step without page scrolling and stays silent.",
        "motion.standard":
          "Scroll the selected card into the first slot using the approved rail movement.",
        "motion.reduced":
          "Change the first slot immediately while retaining selection and focus.",
      },
    },
    relationships: {
      requires: [
        "InterfaceSoundProvider",
        "Pulse Pin cue",
        "CharacterStepRail motion",
      ],
      commonPartners: ["CharacterBanner", "CharacterAvatarEditor"],
      triggers: [
        "onSelect",
        "controlConfirmed on deliberate click or keyboard selection",
      ],
      blocksWhen: [
        {
          when: "a gesture begins during an unfinished rail transition",
          effect:
            "Queue at most the next direction until the current step settles.",
        },
      ],
      exposesState: ["selected step via aria-pressed", "first visible step"],
      role: "Labeled navigation region containing buttons for the five character sections.",
      keyboardSupport:
        "Tab reaches step buttons; ArrowLeft/ArrowRight wrap, Home/End jump to ends, and focus follows selection.",
      screenReader:
        "The region is labeled Character profile sections; the selected button exposes aria-pressed, and duplicate buffer cards are aria-hidden.",
    },
    tokens: {
      color: {
        selected:
          "--color-primary; --color-primary-muted; --color-text-primary",
        resting: "--color-surface; --color-border; --color-text-secondary",
      },
      spacing: {
        cards:
          "--spacing-lg; --spacing-md; --spacing-sm; --character-workspace-step-height",
        clipInset: "--spacing-2xs",
      },
      typography: {
        number: "type-metric-md",
        label: "type-widget-title",
        detail: "type-caption",
      },
      border: { cards: "--color-border; --radius-control" },
      motion: {
        transition: "--motion-surface-duration; --motion-surface-ease",
        reduced: "prefers-reduced-motion: reduce",
      },
      elevation: { selected: "--color-primary-muted" },
    },
    aiHints: {
      priority: "high",
      keywords: [
        "character steps",
        "reactions",
        "rail",
        "wrap",
        "gesture",
        "Pulse Pin",
      ],
      selectionCriteria: {
        choose:
          "A character workspace needs the approved five-step navigation.",
        ownership:
          "The feature owns section content, counts, saving, and selectedId; the rail owns movement and input mechanics.",
      },
      usage: {
        useCases: [
          "Navigate source material through Reactions",
          "Keep active section in the first card slot",
        ],
        commonPatterns: [
          {
            name: "Controlled workspace rail",
            composition:
              "Provide five ordered steps, selectedId, and onSelect; render the selected section below the rail.",
          },
        ],
        antiPatterns: [
          {
            scenario: "A gesture scrolls multiple sections or the page.",
            reason:
              "It breaks the approved one-step navigation and phone behavior.",
            alternative:
              "Use CharacterStepRail's contained wheel/touch handlers.",
          },
          {
            scenario: "Play a cue on passive scroll.",
            reason:
              "The approved interaction reserves sound for deliberate selection.",
            alternative:
              "Let the rail play controlConfirmed only on click or keyboard choice.",
          },
        ],
      },
    },
  },
  {
    component: {
      name: "AiTypingText",
      category: "molecules",
      type: "display",
      description:
        "Terminal Prompt exclusively for C.O.T.S. speech, with a C.O.T.S speaker label, stable layout, viewport-aware cadence, and reduced-motion full text.",
      path: "src/components/ui/typing/ai-typing-text.component.tsx",
      figma: { nodeId: null },
    },
    props: {
      text: {
        type: "string",
        required: true,
        description:
          "Complete C.O.T.S.-authored or clearly labeled C.O.T.S. preview message; screen readers receive all of it at once.",
      },
      speaker: {
        type: "string",
        required: false,
        defaultValue: "C.O.T.S",
        description: "C.O.T.S. prompt label or the current character name.",
      },
      className: {
        type: "string",
        required: false,
        description: "Additional class for the owning surface.",
      },
      speed: {
        type: "number",
        required: false,
        defaultValue: "1",
        description:
          "Multiplier on the approved cadence; bounded by the shared minimum speed.",
      },
      showFull: {
        type: "boolean",
        required: false,
        defaultValue: "false",
        description: "Shows the complete message immediately.",
      },
      visibilityTargetRef: {
        type: "RefObject<Element | null>",
        required: false,
        description:
          "Optional owning surface whose visibility controls the reveal.",
      },
    },
    variants: {
      axes: {
        state: ["revealing", "paused", "complete"],
        motion: ["standard", "reduced"],
        speaker: ["C.O.T.S", "custom"],
      },
      purpose: {
        "state.revealing":
          "Reveal visible characters only while the owning surface is in view and the tab is visible.",
        "state.paused":
          "Keep the current position while offscreen or the tab is hidden.",
        "state.complete": "Show the whole message and remove the caret.",
        "motion.standard":
          "Use the approved Terminal Prompt cadence and caret.",
        "motion.reduced":
          "Show full text immediately and remove caret animation.",
        "speaker.C.O.T.S": "Default character message label.",
        "speaker.custom":
          "Retain the same treatment with the current C.O.T.S. character name.",
      },
    },
    relationships: {
      commonPartners: ["C.O.T.S Daily Message card"],
      exposesState: ["reveal completion via data-complete"],
      role: "Visible C.O.T.S. speech inside a message surface. Longer AI-generated prose uses AiGeneratedText; pending generation uses LoadingIndicator.",
      keyboardSupport:
        "No keyboard action; reveal never delays focus or navigation.",
      screenReader:
        "A single visually hidden copy exposes the complete text, while partial glyphs and caret are aria-hidden.",
    },
    tokens: {
      color: {
        accent: "--ai-typing-accent (surface-supplied); currentColor fallback",
        prompt: "--color-text-muted",
      },
      spacing: { prompt: "--ai-typing-prompt-gap; --spacing-2xs" },
      typography: {
        message:
          "type-quote; --text-quote; --text-quote--font-family; --text-quote--font-weight; --text-quote--letter-spacing; --text-quote--line-height",
        speaker:
          "type-system; --text-system; --text-system--font-family; --text-system--font-weight; --text-system--letter-spacing; --text-system--line-height",
      },
      motion: {
        step: "--ai-typing-step-duration",
        punctuation: "--ai-typing-punctuation-pause",
        caret: "--ai-typing-caret-cycle; prefers-reduced-motion: reduce",
        fallback: "--duration-content",
      },
      elevation: { caret: "--ai-typing-caret-glow" },
    },
    aiHints: {
      priority: "high",
      keywords: [
        "C.O.T.S message",
        "AI typing",
        "Terminal Prompt",
        "typewriter",
        "dashboard lenses",
      ],
      selectionCriteria: {
        choose:
          "Use solely when C.O.T.S. speaks, including daily messages and character conversations.",
        avoid:
          "Longer AI-generated prose uses AiGeneratedText. Pending generation uses LoadingIndicator.",
      },
      usage: {
        useCases: [
          "C.O.T.S Daily Message in every dashboard lens",
          "Ready C.O.T.S. conversation response",
          "Clearly labeled C.O.T.S. speech preview",
        ],
        commonPatterns: [
          {
            name: "Daily message",
            composition:
              "The owning card supplies its area accent and optionally its visibilityTargetRef; AiTypingText renders the message.",
          },
        ],
        antiPatterns: [
          {
            scenario:
              "Use Terminal Prompt for a summary, report or other AI-generated prose.",
            reason:
              "This animation is exclusively the C.O.T.S. speaking treatment.",
            alternative:
              "Use AiGeneratedText with Living Ink for longer AI prose.",
          },
          {
            scenario: "Start reveal before the card enters the viewport.",
            reason: "The user misses the approved animation.",
            alternative:
              "Use the built-in visibility behavior or pass the owning surface ref.",
          },
          {
            scenario: "Create a second feature-local typing animation.",
            reason: "Typography, cadence, and accessibility diverge.",
            alternative: "Reuse AiTypingText.",
          },
        ],
      },
    },
  },
  {
    component: {
      name: "CharacterStepRailPulsePin",
      category: "atoms",
      type: "interactive",
      description:
        "Approved nonvisual Pulse Pin feedback for a deliberate character-step selection; the rail calls the shared sound event rather than rendering a sound component.",
      path: "src/components/ui/sound/config/sound-system.config.ts",
      figma: { nodeId: null },
    },
    props: {},
    variants: {
      axes: {
        trigger: ["click", "keyboard", "gesture"],
        delivery: ["audible", "muted-or-unavailable"],
      },
      purpose: {
        "trigger.click":
          "Play controlConfirmed once when a different step is clicked.",
        "trigger.keyboard":
          "Play controlConfirmed once when a keyboard choice changes the step.",
        "trigger.gesture": "Stay silent during wheel or touch navigation.",
        "delivery.audible":
          "The provider maps controlConfirmed to the Pulse Pin recipe after browser audio is unlocked.",
        "delivery.muted-or-unavailable":
          "Selection still happens immediately with no sound.",
      },
      invalidCombinations: [
        {
          axes: { trigger: "gesture", delivery: "audible" },
          reason: "Passive rail gestures are approved to remain silent.",
        },
      ],
    },
    relationships: {
      requires: [
        "InterfaceSoundProvider",
        "useInterfaceSound",
        "CharacterStepRail",
      ],
      triggers: ["controlConfirmed → pulse-pin"],
      blocksWhen: [
        {
          when: "interface sounds are disabled, the tab is hidden, or browser audio cannot be resumed",
          effect: "Skip playback without blocking selection.",
        },
        {
          when: "the same sound event repeats inside the configured minimum gap",
          effect: "Suppress the duplicate cue.",
        },
      ],
      role: "Supplemental audio acknowledgment; never the sole selection signal.",
      keyboardSupport:
        "Keyboard selection gets the same cue as a deliberate pointer click when audio is enabled.",
      screenReader:
        "No separate announcement; the rail's aria-pressed state conveys selection.",
    },
    tokens: {},
    aiHints: {
      priority: "medium",
      keywords: [
        "Pulse Pin",
        "sound",
        "controlConfirmed",
        "character step",
        "audio cue",
      ],
      selectionCriteria: {
        choose:
          "A deliberate click or keyboard choice changes the character rail's selected step.",
        implementation:
          "Call useInterfaceSound().play('controlConfirmed'); do not synthesize audio in the feature.",
      },
      usage: {
        useCases: ["Confirm a changed character-step selection"],
        commonPatterns: [
          {
            name: "Deliberate rail choice",
            composition:
              "CharacterStepRail invokes the shared controlConfirmed event; the provider applies preference and playback rules.",
          },
        ],
        antiPatterns: [
          {
            scenario:
              "Play sound for every scroll, swipe, hover, or unchanged selection.",
            reason:
              "It makes passive navigation noisy and contradicts approval.",
            alternative:
              "Keep gestures silent and play once for a changed deliberate choice.",
          },
        ],
      },
    },
  },
  {
    component: {
      name: "CharacterStepRailMotion",
      category: "atoms",
      type: "navigation",
      description:
        "Approved nonvisual one-step rail movement and immediate reduced-motion fallback, implemented inside CharacterStepRail.",
      path: "src/components/ui/character-step-rail/character-step-rail.component.tsx",
      figma: { nodeId: null },
    },
    props: {},
    variants: {
      axes: {
        preference: ["standard", "reduced"],
        input: ["discrete", "gesture"],
      },
      purpose: {
        "preference.standard":
          "Smoothly move the newly selected step into the first slot.",
        "preference.reduced":
          "Reposition immediately with no decorative transition.",
        "input.discrete":
          "Click or keyboard selection targets the chosen step.",
        "input.gesture":
          "Wheel or swipe advances one step, then settles the rail.",
      },
    },
    relationships: {
      requires: ["CharacterStepRail"],
      exposesState: ["selectedId", "first visible card"],
      role: "Decorative navigation motion; selection semantics do not depend on animation.",
      keyboardSupport:
        "Keyboard focus follows the chosen button whether motion is enabled or reduced.",
      screenReader:
        "Movement has no announcement; the selected step's aria-pressed state conveys the result.",
    },
    tokens: {
      motion: {
        surface: "--motion-surface-duration; --motion-surface-ease",
        reduced: "prefers-reduced-motion: reduce",
      },
    },
    aiHints: {
      priority: "medium",
      keywords: [
        "rail motion",
        "one step",
        "smooth scroll",
        "reduced motion",
        "first slot",
      ],
      selectionCriteria: {
        choose: "The approved CharacterStepRail changes its selected step.",
        implementation:
          "Use the rail's own scroll and settle behavior; do not layer a second motion system on it.",
      },
      usage: {
        useCases: [
          "Move selected character step to first visible slot",
          "Snap one step after wheel or touch input",
        ],
        commonPatterns: [
          {
            name: "Selected step arrival",
            composition:
              "Change selectedId through CharacterStepRail; it handles smooth or immediate placement.",
          },
        ],
        antiPatterns: [
          {
            scenario: "Wait for animation before updating the active section.",
            reason: "Motion must not delay navigation or focus.",
            alternative:
              "Update onSelect immediately and let movement remain progressive enhancement.",
          },
        ],
      },
    },
  },
] satisfies readonly ComponentMeta[];
