import { EngineeringTechnologyIcon } from "@/features/engineering/technologies/components/engineering-technology-icon.component";
import type { EngineeringTechnologyOption } from "@/features/engineering/types/engineering.types";

export function EngineeringTechnologyStack({
  technologies,
  limit,
}: {
  technologies: EngineeringTechnologyOption[];
  limit?: number;
}) {
  const visible = limit ? technologies.slice(0, limit) : technologies;
  const remaining = technologies.length - visible.length;

  return (
    <div className="engineering-technology-stack" aria-label="Technology stack">
      {visible.map((technology) => (
        <span key={technology.id} title={technology.name}>
          <EngineeringTechnologyIcon iconKey={technology.iconKey} />
          <span className="engineering-technology-name">{technology.name}</span>
        </span>
      ))}
      {remaining > 0 && <span>+{remaining}</span>}
    </div>
  );
}
