import type { ComponentMeta } from "../types/component-meta.types";
export const artworkUploadComponentMeta = {
  component: {
    name: "ArtworkUpload",
    category: "molecules",
    type: "input",
    description:
      "Owner-approved image drop/upload area with preview, replacement, dimensions and contextual prompt action. Approved 12 October 2026.",
    path: "src/components/ui/artwork-upload/artwork-upload.component.tsx",
  },
  props: {
    label: {
      type: "string",
      required: true,
      description: "Composition label and accessible upload/replace name.",
    },
    specification: {
      type: "string",
      required: true,
      description: "Feature-owned aspect ratio and target quality.",
    },
    asset: {
      type: "ArtworkUploadAsset | undefined",
      required: false,
      description: "Current saved href, filename and actual width/height.",
    },
    onUpload: {
      type: "(file: File) => Promise<void>",
      required: true,
      description:
        "Feature validates orientation, persists the original file and updates asset after success. Reject to show an error and preserve existing art.",
    },
    onPrompt: {
      type: "(trigger: HTMLButtonElement) => void",
      required: true,
      description:
        "Feature generates/opens the exact saved prompt; trigger supports return focus.",
    },
    promptReady: {
      type: "boolean",
      required: true,
      description: "Choose Generate prompt or View & copy prompt label.",
    },
    promptBusy: {
      type: "boolean",
      required: false,
      description:
        "Pending prompt writing; never substitutes for an actual AI result.",
    },
    disabled: {
      type: "boolean",
      required: false,
      description: "Unavailable while the owning operation is pending.",
    },
  },
  variants: {
    axes: {
      state: ["empty", "uploaded", "uploading", "failed"],
      prompt: ["missing", "ready", "writing"],
    },
    purpose: {
      "state.empty": "Keyboard file picker and one-file drop target.",
      "state.uploaded": "Contained preview with replace action and dimensions.",
      "state.uploading":
        "Feature operation pending, duplicate selection blocked.",
      "state.failed": "Actionable per-file error, previous asset preserved.",
      "prompt.missing": "Request prompt writing.",
      "prompt.ready": "View and copy the persisted prompt.",
      "prompt.writing": "Writing status with disabled prompt action.",
    },
  },
  relationships: {
    requires: ["Card", "Button", "LoadingIndicator"],
    role: "Artwork input; feature owns files, storage, receipt, orientation validation and approval.",
    keyboardSupport:
      "Native button Tab/Enter/Space opens the file picker; drop is an alternative, never required.",
    screenReader:
      "Labeled selection with associated help/error. File error is announced, prompt remains separately named.",
  },
  tokens: {
    color: {
      focus: "--color-primary",
      error: "--color-danger",
      confirmed: "--color-success",
    },
    spacing: {
      preview:
        "--artwork-upload-preview-ratio; --artwork-upload-preview-min-height; --artwork-upload-preview-mobile-height",
    },
    border: { surface: "--radius-panel; --color-border" },
  },
  aiHints: {
    priority: "high",
    keywords: ["artwork", "upload", "drop", "replace", "prompt"],
    selectionCriteria: {
      imagery: "Use for approved Season banner, portrait and scene uploads.",
    },
    usage: {
      useCases: ["Manual Season imagery"],
      commonPatterns: [
        {
          name: "Chapter compositions",
          composition:
            "Three pace-state upload areas for one selected format, with a chapter navigator and review action.",
        },
      ],
      antiPatterns: [
        {
          scenario: "Treat Uploaded as Approved.",
          reason:
            "Successful storage is separate from likeness/composition review.",
          alternative: "Require feature-owned human review before activation.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
