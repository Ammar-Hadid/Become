import {
  EXPLORATION_WORKSPACE_SLUGS,
  type ExplorationWorkspaceSlug,
} from "@/features/entrepreneurship/explorations/constants/exploration-workspace.constants";

export function explorationHref(nicheId: string, suffix = "") {
  return `/entrepreneurship/explorations/${encodeURIComponent(nicheId)}${suffix}`;
}

export function explorationWorkspaceHref(
  nicheId: string,
  workspace: ExplorationWorkspaceSlug,
  suffix = "",
) {
  return explorationHref(nicheId, `/${workspace}${suffix}`);
}

export function withExplorationReturn(href: string, returnTo: string) {
  const hashIndex = href.indexOf("#");
  const path = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}returnTo=${encodeURIComponent(returnTo)}${hash}`;
}

export function explorationRouteState(pathname: string) {
  const match = pathname.match(
    /^\/entrepreneurship\/explorations\/([^/]+)(?:\/([^/?#]+))?/,
  );
  if (!match) return null;
  const workspace = EXPLORATION_WORKSPACE_SLUGS.has(match[2] ?? "")
    ? (match[2] as ExplorationWorkspaceSlug)
    : "overview";
  return { nicheId: decodeURIComponent(match[1]), workspace };
}

export function contextualBusinessHref(href: string, nicheId?: string) {
  if (!nicheId || !href.startsWith("/entrepreneurship")) return href;
  const relative = href.slice("/entrepreneurship".length);
  if (/^\/market\/niches\//.test(relative))
    return href.replace("/market/niches/", "/explorations/");
  if (/^\/market\/companies(?:[/?#]|$)/.test(relative))
    return explorationHref(
      nicheId,
      relative.replace(/^\/market\/companies/, "/audience/businesses"),
    );
  if (/^\/market(?:[?#]|$)/.test(relative)) {
    const [rawQuery = "", hash = ""] = relative
      .slice("/market".length)
      .split("#", 2);
    const params = new URLSearchParams(
      rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery,
    );
    params.set("kind", "business");
    return `${explorationWorkspaceHref(nicheId, "audience")}?${params}${hash ? `#${hash}` : ""}`;
  }
  const workspaceMappings = [
    [/^\/audience/, "/audience"],
    [/^\/segments/, "/audience/segments"],
    [/^\/people/, "/audience/people"],
    [/^\/companies/, "/audience/businesses"],
    [/^\/evidence/, "/evidence"],
    [/^\/observations/, "/evidence/observations"],
    [/^\/interactions/, "/interactions"],
    [/^\/problems/, "/so-far-we-know/problems"],
    [/^\/offers/, "/offers"],
  ] as const;
  for (const [pattern, replacement] of workspaceMappings)
    if (pattern.test(relative))
      return explorationHref(nicheId, relative.replace(pattern, replacement));
  if (!relative || relative.startsWith("?"))
    return explorationHref(nicheId, `/overview${relative}`);
  return href;
}

export function currentExplorations<
  T extends {
    direction: string;
    archivedAt: Date | null;
    createdAt: Date;
    decisions: { createdAt: Date }[];
  },
>(niches: T[]) {
  const ordered = [...niches].sort(
    (a, b) =>
      (b.decisions[0]?.createdAt ?? b.createdAt).getTime() -
      (a.decisions[0]?.createdAt ?? a.createdAt).getTime(),
  );
  const active = ordered.filter(
    (n) => !n.archivedAt && ["EXPLORING", "PURSUING"].includes(n.direction),
  );
  return {
    current: active[0],
    alsoActive: active.slice(1),
    past: ordered.filter((n) => !active.includes(n)),
  };
}
