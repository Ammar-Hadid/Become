import type { ComponentMeta } from "../types/component-meta.types";

export const workspaceComponentMeta = {
  component: {
    name: "Workspace",
    category: "organisms",
    type: "container",
    description:
      "Owner-authorized whole-app redesign composition (27 October 2026). Opt-in page/header/navigation/panel/metric/disclosure roles and redesigned buttons; preserves protected dashboard and Season opening defaults.",
    path: "src/components/ui/workspace/workspace.component.tsx",
  },
  props: {
    area: {
      type: "WorkspaceArea",
      required: false,
      defaultValue: "direction",
      values: [
        "finance",
        "engineering",
        "entrepreneurship",
        "content",
        "direction",
        "settings",
      ],
      description:
        "Uses the approved area's accent. Features retain their data, copy and persistence.",
    },
    className: {
      type: "string",
      required: false,
      description:
        "Composition hook; use page-shell at the route boundary for equal gutters.",
    },
    children: {
      type: "ReactNode",
      required: true,
      description:
        "Compose a header, navigation, real Card panels, metrics, links and optional disclosure. No workflow logic is inferred.",
    },
  },
  variants: {
    axes: {
      area: [
        "finance",
        "engineering",
        "entrepreneurship",
        "content",
        "direction",
        "settings",
      ],
    },
    purpose: {
      "area.finance": "Finance's teal accent",
      "area.engineering": "Engineering's lavender accent",
      "area.entrepreneurship": "Entrepreneurship's blue accent",
      "area.content": "Content's rose accent",
      "area.direction": "Become gold",
      "area.settings": "Become gold for configuration",
    },
  },
  relationships: {
    commonPartners: [
      "Card",
      "Button",
      "Input",
      "Textarea",
      "NativeSelect",
      "WorkspaceNavigation",
      "WorkspaceDisclosure",
    ],
    role: "One page purpose with grouped information and reachable detail.",
    keyboardSupport:
      "Native links/buttons/details/select. Navigation retains visible focus and scrolls the active link into view; no custom arrow-key tab model.",
    screenReader:
      "Semantic page heading, named navigation, labeled fields and native disclosure; numeric facts remain readable without color or sound.",
  },
  tokens: {
    color: { accent: "--workspace-accent" },
    spacing: {
      section: "--space-overview-section",
      panel: "--space-overview-panel",
      controlGap: "--button-gap",
    },
    border: { controls: "--workspace-control-radius" },
    motion: { control: "--motion-control-duration" },
  },
  aiHints: {
    priority: "high",
    keywords: ["workspace", "overview", "records", "simple", "redesign"],
    selectionCriteria: {
      use: "All redesigned product areas except the protected dashboard and approved opening.",
    },
    usage: {
      useCases: [
        "Domain overview",
        "Grouped records",
        "Focused task",
        "Optional details",
      ],
      commonPatterns: [
        {
          name: "Workspace",
          composition:
            "Workspace + navigation + header + role-specific Card panels",
        },
      ],
      antiPatterns: [
        {
          scenario: "Apply workspace defaults globally",
          reason:
            "Protected approved compositions must retain their existing presentation.",
          alternative: "Opt in at the feature's route boundary.",
        },
        {
          scenario: "Hide required fields or erase stored definitions",
          reason: "Simplicity must retain behavior and recoverability.",
          alternative:
            "Keep required steps visible and prior evidence readable.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
