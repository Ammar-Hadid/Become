import { threadApprovedComponentMeta } from "../constants/thread-approved-component-meta.constants";

/** Keep Storybook guidance aligned with the approved, machine-readable metadata. */
export function storybookDescription(name: string) {
  const meta = threadApprovedComponentMeta.find(
    (entry) => entry.component.name === name,
  );
  if (!meta) throw new Error(`No thread-approved metadata for ${name}.`);

  return [
    meta.component.description,
    `**Use when:** ${meta.aiHints.usage.useCases.join("; ")}.`,
    `**Keyboard:** ${meta.relationships.keyboardSupport}`,
    `**Screen reader:** ${meta.relationships.screenReader}`,
    `**Avoid:** ${meta.aiHints.usage.antiPatterns
      .map((pattern) => `${pattern.scenario} ${pattern.alternative}`)
      .join(" ")}`,
  ].join("\n\n");
}
