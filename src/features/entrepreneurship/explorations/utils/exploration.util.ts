export function explorationHref(nicheId: string, suffix = "") {
  return `/entrepreneurship/explorations/${encodeURIComponent(nicheId)}${suffix}`;
}

export function contextualBusinessHref(href: string, nicheId?: string) {
  if (!nicheId || !href.startsWith("/entrepreneurship")) return href;
  const relative = href.slice("/entrepreneurship".length);
  if (/^\/market\/niches\//.test(relative))
    return href.replace("/market/niches/", "/explorations/");
  if (/^\/market(?:[/?#]|$)/.test(relative))
    return explorationHref(
      nicheId,
      relative.replace(/^\/market(?:\/companies)?/, "/scope/businesses"),
    );
  const stageMappings = [
    [/^\/audience/, "/scope"],
    [/^\/segments/, "/scope/segments"],
    [/^\/people/, "/scope/people"],
    [/^\/companies/, "/scope/businesses"],
    [/^\/evidence/, "/learn/sources"],
    [/^\/observations/, "/learn/observations"],
    [/^\/interactions/, "/learn/conversations"],
    [/^\/problems/, "/decide/problems"],
    [/^\/offers/, "/test/offers"],
  ] as const;
  for (const [pattern, replacement] of stageMappings)
    if (pattern.test(relative))
      return explorationHref(nicheId, relative.replace(pattern, replacement));
  if (!relative || relative.startsWith("?"))
    return explorationHref(nicheId, `/snapshot${relative}`);
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
