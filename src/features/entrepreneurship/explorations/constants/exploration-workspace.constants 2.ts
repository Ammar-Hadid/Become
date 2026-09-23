export const EXPLORATION_WORKSPACES = [
  { slug: "overview", label: "Overview" },
  { slug: "so-far-we-know", label: "So Far We Know" },
  { slug: "audience", label: "Audience" },
  { slug: "outreach", label: "Outreach" },
  { slug: "conversations", label: "Conversations" },
  { slug: "evidence", label: "Evidence" },
  { slug: "offers", label: "Offers" },
] as const;

export type ExplorationWorkspaceSlug =
  (typeof EXPLORATION_WORKSPACES)[number]["slug"];

export const EXPLORATION_WORKSPACE_SLUGS = new Set<string>(
  EXPLORATION_WORKSPACES.map(({ slug }) => slug),
);
