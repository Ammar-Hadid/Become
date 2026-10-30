"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { CharacterBanner } from "@/components/ui/character-banner/character-banner.component";
import { CharacterStepRail } from "@/components/ui/character-step-rail/character-step-rail.component";
import { FieldLabel } from "@/components/ui/forms/field.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";
import { LIVING_LEVI_BANNER_EXAMPLE } from "@/features/seasons/living/constants/living-character-banner-example.constants";
import { CHARACTER_WORKSPACE_SECTIONS } from "@/features/seasons/living/character-workspace/constants/character-workspace-sections.constants";
import { CHARACTER_REACTION_FIELDS } from "@/features/seasons/living/character-workspace/constants/character-reaction-fields.constants";
import "./reactions-candidate.css";

type ReactionField = (typeof CHARACTER_REACTION_FIELDS)[number]["id"];
type StepId = (typeof steps)[number]["id"];

const steps = [
  ...CHARACTER_WORKSPACE_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
  })),
  { id: "reactions", label: "Reactions" },
] as const;

const storageKey = "become-reactions-rail-candidate";

function countFor(profile: LivingCharacterProfile, id: StepId) {
  if (id === "reactions")
    return CHARACTER_REACTION_FIELDS.filter((field) => profile[field.id].trim())
      .length;
  return profile[id].length;
}

export function ReactionsCandidate({
  initialProfile,
}: {
  initialProfile: LivingCharacterProfile;
}) {
  const { play } = useInterfaceSound();
  const [profile, setProfile] = useState(initialProfile);
  const [active, setActive] = useState<StepId>("sources");
  const [dirty, setDirty] = useState(false);
  const [approved, setApproved] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [notice, setNotice] = useState(
    "This approval preview saves only in this browser.",
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (!saved) return;
        const parsed = JSON.parse(saved) as {
          characterName?: string;
          values?: Partial<Record<ReactionField, string>>;
          approved?: boolean;
        };
        if (parsed.characterName !== initialProfile.characterName) return;
        setProfile((previous) => ({ ...previous, ...parsed.values }));
        setApproved(Boolean(parsed.approved));
        setHasSaved(true);
        setNotice("Saved candidate revision restored from this browser.");
      } catch {
        setNotice("The saved candidate revision could not be loaded.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialProfile.characterName]);

  function saveCandidate() {
    const values = Object.fromEntries(
      CHARACTER_REACTION_FIELDS.map((field) => [field.id, profile[field.id]]),
    );
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          characterName: profile.characterName,
          values,
          approved: false,
        }),
      );
      setDirty(false);
      setApproved(false);
      setHasSaved(true);
      setNotice(
        "Candidate revision saved in this browser. Review it before approval.",
      );
      play("saveConfirmed");
    } catch {
      setNotice("This browser could not save the candidate revision.");
    }
  }

  function approveCandidate() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ ...JSON.parse(saved), approved: true }),
      );
      setApproved(true);
      setNotice(
        "Candidate revision approved locally. The live Season is unchanged.",
      );
      play("controlConfirmed");
    } catch {
      setNotice("This browser could not approve the candidate revision.");
    }
  }

  const current = steps.find((step) => step.id === active)!;
  const entries = active === "reactions" ? [] : profile[active];

  return (
    <main className="reactions-candidate">
      <div className="reactions-candidate__intro">
        <div>
          <p className="type-overline">
            CHARACTER WORKSPACE · APPROVAL PREVIEW
          </p>
          <h1 className="type-page-title">Reactions step</h1>
          <p className="type-body-sm">
            Scroll the rail or choose a step. The selected step moves into the
            first slot.
          </p>
        </div>
        <span className="type-caption">Preview only · no Season changes</span>
      </div>
      <div className="reactions-candidate__workspace">
        <div className="reactions-candidate__main">
          <CharacterBanner
            content={{
              name: profile.characterName,
              sourceWork: profile.sourceWork,
              adaptation: profile.adaptation,
              ...LIVING_LEVI_BANNER_EXAMPLE,
            }}
          />
          <CharacterStepRail
            steps={steps.map((step) => {
              const count = countFor(profile, step.id);
              return {
                ...step,
                detail:
                  step.id === "reactions"
                    ? `${count} of 5 fields filled`
                    : `${count} ${step.id === "sources" ? "reference" : "detail"}${count === 1 ? "" : "s"}`,
              };
            })}
            selectedId={active}
            onSelect={setActive}
          />
          <Card
            as="section"
            spacing="dense"
            className="reactions-candidate__panel"
            key={active}
          >
            <header className="reactions-candidate__heading">
              <IconFrame treatment="featured" area="direction">
                <MessageSquareText />
              </IconFrame>
              <div>
                <p className="type-overline">
                  STEP {steps.findIndex((step) => step.id === active) + 1} OF 5
                </p>
                <h2 className="type-section-title">{current.label}</h2>
                <p className="type-body-sm">
                  {active === "reactions"
                    ? "Describe how this C.O.T.S. responds and how those reactions appear in imagery."
                    : CHARACTER_WORKSPACE_SECTIONS.find(
                        (step) => step.id === active,
                      )?.description}
                </p>
              </div>
            </header>
            {active === "reactions" ? (
              <div className="reactions-candidate__fields">
                {CHARACTER_REACTION_FIELDS.map((field) => (
                  <FieldLabel key={field.id}>
                    {field.label}
                    <Textarea
                      size="md"
                      maxLength={field.limit}
                      value={profile[field.id]}
                      onChange={(event) => {
                        setProfile((previous) => ({
                          ...previous,
                          [field.id]: event.target.value,
                        }));
                        setDirty(true);
                        setApproved(false);
                      }}
                    />
                  </FieldLabel>
                ))}
              </div>
            ) : (
              <div className="reactions-candidate__records">
                {entries.map((entry, index) => (
                  <div
                    key={"id" in entry ? entry.id : `${active}-${index}`}
                    className="reactions-candidate__record type-body-sm"
                  >
                    <span className="type-overline">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      {"title" in entry ? entry.title : entry.description}
                    </span>
                  </div>
                ))}
                {entries.length === 0 && (
                  <p className="type-body-sm">
                    No saved records in this step yet.
                  </p>
                )}
              </div>
            )}
            <div className="reactions-candidate__actions">
              <p className="type-caption" role="status">
                {notice}
              </p>
              <div>
                <Button disabled={!dirty} onClick={saveCandidate}>
                  Save profile revision
                </Button>
                <Button
                  variant="secondary"
                  disabled={dirty || approved || !hasSaved}
                  onClick={approveCandidate}
                >
                  Approve profile
                </Button>
              </div>
            </div>
          </Card>
        </div>
        <aside
          className="reactions-candidate__sidebar"
          aria-label="Character context"
        >
          <Card as="section" spacing="dense">
            <p className="type-overline">CHARACTER STATUS</p>
            <h2 className="type-widget-title">{profile.characterName}</h2>
            <p className="type-body-sm">
              {profile.sources.length} sources ·{" "}
              {profile.speechPatterns.length +
                profile.signaturePhrases.length +
                profile.canonReferences.length}{" "}
              sourced details
            </p>
            <p className="type-caption">
              This preview keeps your Season unchanged. Its save and approval
              controls demonstrate where the live actions will remain on every
              step.
            </p>
          </Card>
        </aside>
      </div>
    </main>
  );
}
