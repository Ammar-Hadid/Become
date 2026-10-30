"use client";

import { ArrowRight, Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badges/badge.component";
import { Button } from "@/components/ui/buttons/button.component";
import { ProgressIndicator } from "@/components/ui/progress/progress-indicator.component";
import type { CHARACTER_WORKSPACE_SECTIONS } from "../constants/character-workspace-sections.constants";
import "./character-influence-explainer.css";

type Section = (typeof CHARACTER_WORKSPACE_SECTIONS)[number];

export function CharacterInfluenceExplainer({
  section,
  sectionNumber,
  linkedCount,
  entryCount,
  onAdd,
}: {
  section: Section;
  sectionNumber: number;
  linkedCount: number;
  entryCount: number;
  onAdd: () => void;
}) {
  const addLabel =
    section.id === "sources"
      ? "Add source material"
      : `Add ${section.singular}`;
  const readiness =
    entryCount === 0
      ? section.id === "signaturePhrases"
        ? "Optional · none added"
        : "No entries yet"
      : `${linkedCount} of ${entryCount} ${section.id === "sources" ? "sources described" : "details cited"}`;

  return (
    <div className="character-influence-explainer">
      <header className="character-influence-header">
        <span className="type-overline">
          {String(sectionNumber).padStart(2, "0")} / CHARACTER INPUT
        </span>
        <Badge variant="specimen-strip" area="direction">
          {section.influence.label}
        </Badge>
      </header>

      <div className="character-influence-intro">
        <h3 className="type-section-title">{section.label}</h3>
        <p className="type-body">{section.explanation}</p>
      </div>

      <div className="character-influence-scale">
        <div className="character-influence-scale-copy">
          <span className="type-overline">INFLUENCE ON C.O.T.S.</span>
          <p className="type-body-sm">{section.influence.detail}</p>
          <small className="type-caption">
            Relative design importance, not a measured share of an AI response.
          </small>
        </div>
        <ProgressIndicator
          variant="segmented-halo"
          area="direction"
          value={section.influence.percent}
          label={`${section.label}: ${section.influence.percent}% relative design importance`}
          caption="INFLUENCE"
        />
      </div>

      <div className="character-influence-effects">
        <span className="type-overline">WHAT THIS CHANGES</span>
        <ul>
          {section.points.map((point) => (
            <li className="type-body-sm" key={point}>
              <Check aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="character-influence-footer">
        <div>
          <span className="type-overline">RECORD READINESS</span>
          <strong className="type-body-sm">{readiness}</strong>
        </div>
        <Button type="button" onClick={onAdd}>
          <Plus aria-hidden="true" /> {addLabel}
          <ArrowRight aria-hidden="true" />
        </Button>
      </footer>
    </div>
  );
}
