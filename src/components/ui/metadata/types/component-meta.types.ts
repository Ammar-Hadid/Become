/** Describes the public input of a shared component or approved treatment. */
export interface PropDef {
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
  values?: readonly string[];
}

export interface ComponentMeta {
  component: {
    name: string;
    category: "atoms" | "molecules" | "organisms";
    type: "interactive" | "display" | "container" | "input" | "navigation";
    description: string;
    path: string;
    figma?: { nodeId: string | null };
  };
  props: Record<string, PropDef>;
  variants: {
    axes: Record<string, readonly string[]>;
    purpose: Record<`${string}.${string}`, string>;
    invalidCombinations?: {
      axes: Record<string, string>;
      reason: string;
    }[];
  };
  relationships: {
    requires?: string[];
    mustBeChildOf?: string[];
    mustBeParentOf?: string[];
    optionalSibling?: string[];
    commonPartners?: string[];
    triggers?: string[];
    blocksWhen?: { when: string; effect: string }[];
    exposesState?: string[];
    role: string;
    keyboardSupport: string;
    screenReader: string;
  };
  tokens: {
    color?: Record<string, string>;
    spacing?: Record<string, string>;
    typography?: Record<string, string>;
    border?: Record<string, string>;
    motion?: Record<string, string>;
    elevation?: Record<string, string>;
  };
  aiHints: {
    priority: "high" | "medium" | "low";
    keywords: string[];
    selectionCriteria: Record<string, string>;
    usage: {
      useCases: string[];
      commonPatterns: { name: string; composition: string }[];
      antiPatterns: {
        scenario: string;
        reason: string;
        alternative: string;
      }[];
    };
  };
}
