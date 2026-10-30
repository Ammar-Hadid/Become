"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  FileText,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badges/badge.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { CHARACTER_WORKSPACE_SECTIONS } from "@/features/seasons/living/character-workspace/constants/character-workspace-sections.constants";
import { CharacterInfluenceExplainer } from "@/features/seasons/living/character-workspace/components/character-influence-explainer.component";
import {
  CharacterQuoteStudy,
  type CharacterQuoteVariant,
} from "./character-quote-study.component";
import "./character-workspace-approval.css";

type Candidate = "a" | "b" | "c";
const options = ["a", "b", "c"] as const;
const choiceLabels = {
  selector: {
    a: "A · Guided glow",
    b: "B · Editorial line",
    c: "C · Compact rail",
  },
  row: { a: "A · Glow card", b: "B · Editorial line", c: "C · Paired tiles" },
  banner: { a: "A · Balanced", b: "B · Quiet crop", c: "C · Image-led" },
  motion: { a: "A · Fade up", b: "B · Crossfade", c: "C · Lateral slide" },
  status: {
    a: "A · Evidence card",
    b: "B · Accent rule",
    c: "C · Compact chips",
  },
  quote: {
    a: "A · Editorial quotation",
    b: "B · Margin quote",
    c: "C · Framed quote",
  },
} satisfies Record<string, Record<Candidate, string>>;

export function CharacterWorkspaceApproval() {
  const router = useRouter();
  const [selector, setSelector] = useState<Candidate>("a");
  const [row, setRow] = useState<Candidate>("a");
  const [banner, setBanner] = useState<Candidate>("a");
  const [motion, setMotion] = useState<Candidate>("a");
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<Candidate>("a");
  const [quote, setQuote] = useState<Candidate>("a");
  const quoteLayouts: Record<Candidate, CharacterQuoteVariant> = {
    a: "editorial",
    b: "margin",
    c: "framed",
  };

  return (
    <main className="character-workspace-approval">
      <header className="character-workspace-approval-header">
        <div>
          <Badge variant="specimen-strip" area="direction">
            CANDIDATE PREVIEW · NOT IN SHARED LIBRARY
          </Badge>
          <h1 className="type-page-title">Character workspace studies</h1>
          <p className="type-body">
            Compare the new treatments used by the separate, working C.O.T.S.
            character preview. Nothing here changes the live Season editor.
          </p>
        </div>
        <Button onClick={() => router.push("/cots-character-preview")}>
          Open working preview <ArrowRight aria-hidden="true" />
        </Button>
      </header>

      <Study
        number="01"
        title="Section selector"
        description="The default preview uses A. Compare density and selection feedback before this becomes shared."
      >
        <Choices
          value={selector}
          onChange={setSelector}
          labels={choiceLabels.selector}
        />
        <div
          className="character-workspace-approval-selectors"
          data-variant={selector}
        >
          {[
            "Source material",
            "Speech patterns",
            "Signature phrases",
            "Canon references",
          ].map((title, index) => (
            <div
              className="character-workspace-approval-selector"
              data-active={index === 0}
              key={title}
            >
              <span className="type-metric-md">{index + 1}.</span>
              <span className="type-widget-title">{title}</span>
              <ChevronRight aria-hidden="true" />
            </div>
          ))}
        </div>
      </Study>

      <Study
        number="02"
        title="Editable evidence row"
        description="The default preview uses A. All versions open the same edit form; only the row treatment differs."
      >
        <Choices value={row} onChange={setRow} labels={choiceLabels.row} />
        <div className="character-workspace-approval-rows" data-variant={row}>
          <div className="character-workspace-approval-row" data-active="true">
            <IconFrame treatment="compact" area="direction">
              <FileText />
            </IconFrame>
            <span>
              <strong className="type-label">Season 1 character profile</strong>
              <small className="type-caption">
                shingeki.tv · official material
              </small>
            </span>
            <ChevronRight aria-hidden="true" />
          </div>
          <div className="character-workspace-approval-row">
            <IconFrame treatment="compact" area="direction">
              <FileText />
            </IconFrame>
            <span>
              <strong className="type-label">Episode 19 synopsis</strong>
              <small className="type-caption">
                shingeki.tv · official material
              </small>
            </span>
            <ChevronRight aria-hidden="true" />
          </div>
        </div>
      </Study>

      <Study
        number="03"
        title="Character-step banner"
        description="This generated image belongs to step 02 only. The dashboard Season banner is a separate asset."
      >
        <Choices
          value={banner}
          onChange={setBanner}
          labels={choiceLabels.banner}
        />
        <div
          className="character-workspace-approval-banner"
          data-variant={banner}
        >
          <Image
            src="/design-review/character-workspace-v2/levi-character-banner.png"
            alt="Levi Ackerman in a Survey Corps rooftop setting at dusk"
            fill
            unoptimized
            sizes="(max-width: 700px) 100vw, 900px"
          />
          <div>
            <Badge variant="specimen-strip" area="direction">
              Character of the Season
            </Badge>
            <h3 className="type-page-title">Levi Ackerman</h3>
            <p className="type-body">Attack on Titan · TV anime</p>
          </div>
        </div>
      </Study>

      <Study
        number="04"
        title="Explainer → editor motion"
        description="The default preview uses A. Try the transition with the button; each option uses approved motion timing and supports reduced motion."
      >
        <Choices
          value={motion}
          labels={choiceLabels.motion}
          onChange={(value) => {
            setMotion(value);
            setShowForm(false);
          }}
        />
        <div
          className="character-workspace-approval-motion"
          data-variant={motion}
          data-editing={showForm}
        >
          <div
            className="character-workspace-approval-motion-copy"
            aria-hidden={showForm}
          >
            <BookOpen aria-hidden="true" />
            <h3 className="type-section-title">Source material</h3>
            <p className="type-body">
              Sources ground the character in reviewed material and support
              details with citations.
            </p>
          </div>
          <div
            className="character-workspace-approval-motion-form"
            aria-hidden={!showForm}
          >
            <p className="type-overline">NEW SOURCE</p>
            <h3 className="type-section-title">Add source material</h3>
            <div className="character-workspace-approval-field type-body-sm">
              Source title
            </div>
            <div className="character-workspace-approval-field type-body-sm">
              What this source establishes
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowForm((value) => !value)}
        >
          <Plus aria-hidden="true" />{" "}
          {showForm ? "Show explainer" : "Add source material"}
        </Button>
      </Study>

      <Study
        number="05"
        title="Readiness evidence"
        description="No synthetic canon score: these options show only counts that Become can calculate from profile fields and citations."
      >
        <Choices
          value={status}
          onChange={setStatus}
          labels={choiceLabels.status}
        />
        <div
          className="character-workspace-approval-status"
          data-variant={status}
        >
          <strong className="type-widget-title">Record coverage</strong>
          <span className="type-body-sm">3/3 source fields complete</span>
          <span className="type-body-sm">6/6 details cite a source</span>
          <small className="type-caption">
            Canon accuracy requires human review.
          </small>
        </div>
      </Study>

      <Study
        number="06"
        title="C.O.T.S. influence explainer"
        description="The approved shared Segmented Halo shows a relative design-importance rating as a percentage. It does not measure the share of an AI response. The action stays at the card's end."
      >
        <div className="character-workspace-approval-influence">
          <CharacterInfluenceExplainer
            section={CHARACTER_WORKSPACE_SECTIONS[0]}
            sectionNumber={1}
            linkedCount={3}
            entryCount={3}
            onAdd={() => router.push("/cots-character-preview")}
          />
        </div>
      </Study>

      <Study
        number="07"
        title="Character quote card"
        description="The current sidebar note reads like a normal information card. Compare three quotation treatments at the same narrow card width. This is a visual candidate only."
      >
        <Choices
          value={quote}
          onChange={setQuote}
          labels={choiceLabels.quote}
        />
        <div className="character-workspace-approval-quote">
          <CharacterQuoteStudy variant={quoteLayouts[quote]} />
        </div>
      </Study>

      <Card
        as="section"
        spacing="dense"
        className="character-workspace-approval-sound"
      >
        <h2 className="type-section-title">Sound</h2>
        <p className="type-body-sm">
          No new sound is proposed. The working preview reuses the approved
          section-selection cue and C.O.T.S. answer cue. Silent operation
          remains available through the existing sound setting.
        </p>
      </Card>
      <footer className="type-body-sm">
        This page is for reviewing candidates.{" "}
        <Link href="/cots-character-preview">Open the working preview</Link> to
        test real editing and AI response behavior.
      </footer>
    </main>
  );
}

function Choices({
  value,
  onChange,
  labels,
}: {
  value: Candidate;
  onChange: (value: Candidate) => void;
  labels: Record<Candidate, string>;
}) {
  return (
    <div
      className="character-workspace-approval-choices"
      role="group"
      aria-label="Design alternatives"
    >
      {options.map((option) => (
        <Button
          type="button"
          variant={value === option ? "primary" : "secondary"}
          size="sm"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          key={option}
        >
          {labels[option]}
        </Button>
      ))}
    </div>
  );
}

function Study({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card
      as="section"
      spacing="dense"
      className="character-workspace-approval-study"
    >
      <span className="type-overline">CANDIDATE {number}</span>
      <h2 className="type-section-title">{title}</h2>
      <p className="type-body-sm">{description}</p>
      {children}
    </Card>
  );
}
