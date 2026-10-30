"use client";

import { useEffect, useRef, useState, type FormEvent, type Ref } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  FileText,
  Info,
  MessageSquareText,
  Pencil,
  Play,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badges/badge.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { CharacterBanner } from "@/components/ui/character-banner/character-banner.component";
import {
  CharacterStepRail,
  type CharacterStepRailItem,
} from "@/components/ui/character-step-rail/character-step-rail.component";
import { FieldError, FieldLabel } from "@/components/ui/forms/field.component";
import { Input } from "@/components/ui/forms/input.component";
import {
  Checkbox,
  SelectionLabel,
} from "@/components/ui/forms/selection.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import { ProgressIndicator } from "@/components/ui/progress/progress-indicator.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import { AiTypingText } from "@/components/ui/typing/ai-typing-text.component";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";
import {
  CHARACTER_WORKSPACE_SECTIONS,
  type CharacterWorkspaceSectionId,
} from "../constants/character-workspace-sections.constants";
import { CHARACTER_REACTION_FIELDS } from "../constants/character-reaction-fields.constants";
import { characterWorkspaceMetrics } from "../utils/character-workspace-metrics.util";
import { characterResponseReadiness } from "../utils/character-response-readiness.util";
import { CharacterInfluenceExplainer } from "./character-influence-explainer.component";
import {
  avatarImageStyle,
  CharacterAvatarEditor,
  DEFAULT_AVATAR_PLACEMENT,
  type AvatarPlacement,
} from "@/components/ui/character-avatar/character-avatar-editor.component";
import "./character-workspace.css";

type EntryDraft = {
  title: string;
  url: string;
  notes: string;
  description: string;
  sourceIds: string[];
};

const emptyDraft: EntryDraft = {
  title: "",
  url: "",
  notes: "",
  description: "",
  sourceIds: [],
};

const exampleQuestion = "How do you approach a difficult decision?";
const exampleResponse =
  "You gather the facts, weigh the consequences, and choose what keeps people alive. Indecision gets people killed.";

type CharacterWorkspaceStepId = CharacterWorkspaceSectionId | "reactions";

export type CandidateBannerArt = {
  desktopSrc?: string | null;
  phoneSrc?: string | null;
  avatarSrc?: string | null;
  generatedAvatarSrc?: string | null;
  alt: string;
  quote: string;
  attribution: string;
  rightLine: string;
  exampleResponse?: string;
  crop?: AvatarPlacement;
};

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function sourceHost(url?: string) {
  if (!url) return "Source notes";
  try {
    return new URL(url).hostname;
  } catch {
    return "Source link";
  }
}

export function CharacterWorkspacePreview({
  initialProfile,
  showBanner = true,
  year,
  quarter,
  version,
  approved,
  active,
  responseAvailable,
  candidateArt,
  onSaveProfile,
  onApproveProfile,
  onAvatarApply,
  avatarPersistenceHint,
  busy = false,
  profileId,
}: {
  initialProfile: LivingCharacterProfile;
  showBanner?: boolean;
  year: number;
  quarter: number;
  version: number;
  approved: boolean;
  active: boolean;
  responseAvailable: boolean;
  candidateArt?: CandidateBannerArt;
  onSaveProfile?: (profile: LivingCharacterProfile) => Promise<boolean>;
  onApproveProfile?: (profileId: string) => Promise<boolean>;
  onAvatarApply?: (
    source: string,
    placement: AvatarPlacement,
    file?: File,
  ) => Promise<boolean>;
  avatarPersistenceHint?: string;
  busy?: boolean;
  profileId?: string | null;
}) {
  const { play } = useInterfaceSound();
  const [profile, setProfile] = useState(initialProfile);
  const [section, setSection] =
    useState<CharacterWorkspaceSectionId>("sources");
  const [step, setStep] = useState<CharacterWorkspaceStepId>("sources");
  const [editorMode, setEditorMode] = useState<"overview" | "add" | "edit">(
    "overview",
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [draft, setDraft] = useState<EntryDraft>(emptyDraft);
  const [entryError, setEntryError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [question, setQuestion] = useState(exampleQuestion);
  const [response, setResponse] = useState("");
  const [responseQuestion, setResponseQuestion] = useState("");
  const [responseKind, setResponseKind] = useState<"example" | "ai" | null>(
    null,
  );
  const [responseView, setResponseView] = useState<"question" | "answer">(
    "question",
  );
  const [responseError, setResponseError] = useState("");
  const [responsePending, setResponsePending] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState<{
    baseSource: string;
    source: string;
    placement: AvatarPlacement;
  } | null>(null);
  const baseAvatarSource = candidateArt?.avatarSrc ?? "";
  const avatarSource =
    avatarOverride?.baseSource === baseAvatarSource
      ? avatarOverride.source
      : baseAvatarSource;
  const avatarPlacement =
    avatarOverride?.baseSource === baseAvatarSource
      ? avatarOverride.placement
      : (candidateArt?.crop ?? DEFAULT_AVATAR_PLACEMENT);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const responseResultRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const metrics = characterWorkspaceMetrics(profile);
  const responseReadiness = characterResponseReadiness(profile);
  const currentSection = CHARACTER_WORKSPACE_SECTIONS.find(
    (item) => item.id === section,
  )!;
  const addLabel =
    section === "sources"
      ? "Add source material"
      : `Add ${currentSection.singular}`;
  const entries = section === "sources" ? profile.sources : profile[section];
  const citedSources = new Set(profile.sources.map((source) => source.id));
  const sectionLinked =
    section === "sources"
      ? metrics.describedSources
      : profile[section].filter((entry) =>
          entry.sourceIds.some((id) => citedSources.has(id)),
        ).length;
  const reactionCount = CHARACTER_REACTION_FIELDS.filter((field) =>
    profile[field.id].trim(),
  ).length;
  const railSteps: CharacterStepRailItem<CharacterWorkspaceStepId>[] = [
    ...CHARACTER_WORKSPACE_SECTIONS.map((item) => {
      const count = profile[item.id].length;
      return {
        id: item.id,
        label: item.label,
        detail: countLabel(
          count,
          item.id === "sources" ? "reference" : "detail",
        ),
      };
    }),
    {
      id: "reactions",
      label: "Reactions",
      detail: `${reactionCount} of 5 fields filled`,
    },
  ];

  useEffect(() => {
    if (responseView === "answer")
      responseResultRef.current?.focus({ preventScroll: true });
  }, [responseView]);

  useEffect(() => {
    return () => {
      if (avatarSource.startsWith("blob:")) URL.revokeObjectURL(avatarSource);
    };
  }, [avatarSource]);

  function focusEditor() {
    window.requestAnimationFrame(() => {
      firstFieldRef.current?.focus({ preventScroll: true });
      editorRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function chooseStep(next: CharacterWorkspaceStepId) {
    setStep(next);
    if (next !== "reactions") setSection(next);
    setEditorMode("overview");
    setSelectedIndex(null);
    setEntryError("");
    setNotice("");
  }

  function openAdd() {
    setDraft({
      ...emptyDraft,
      sourceIds: profile.sources[0] ? [profile.sources[0].id] : [],
    });
    setSelectedIndex(null);
    setEditorMode("add");
    setEntryError("");
    focusEditor();
  }

  function openEdit(index: number) {
    if (section === "sources") {
      const source = profile.sources[index];
      setDraft({
        ...emptyDraft,
        title: source.title,
        url: source.url ?? "",
        notes: source.notes,
      });
    } else {
      const detail = profile[section][index];
      setDraft({
        ...emptyDraft,
        description: detail.description,
        sourceIds: detail.sourceIds,
      });
    }
    setSelectedIndex(index);
    setEditorMode("edit");
    setEntryError("");
    focusEditor();
  }

  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (section === "sources") {
      const title = draft.title.trim();
      const notes = draft.notes.trim();
      if (!title || !notes) {
        setEntryError("Add a title and what this source establishes.");
        return;
      }
      if (editorMode === "add" && profile.sources.length >= 30) {
        setEntryError("A profile can have up to 30 sources.");
        return;
      }
      const entry = {
        id:
          editorMode === "edit" && selectedIndex !== null
            ? profile.sources[selectedIndex].id
            : `preview-${crypto.randomUUID()}`,
        title,
        notes,
        ...(draft.url.trim() ? { url: draft.url.trim() } : {}),
      };
      setProfile((previous) => ({
        ...previous,
        sources:
          editorMode === "edit" && selectedIndex !== null
            ? previous.sources.map((item, index) =>
                index === selectedIndex ? entry : item,
              )
            : [...previous.sources, entry],
      }));
    } else {
      const description = draft.description.trim();
      if (!description || draft.sourceIds.length === 0) {
        setEntryError("Describe the detail and choose a supporting source.");
        return;
      }
      const limit =
        section === "speechPatterns"
          ? 16
          : section === "signaturePhrases"
            ? 12
            : 20;
      if (editorMode === "add" && profile[section].length >= limit) {
        setEntryError(`This section can have up to ${limit} details.`);
        return;
      }
      const entry = { description, sourceIds: draft.sourceIds };
      setProfile((previous) => ({
        ...previous,
        [section]:
          editorMode === "edit" && selectedIndex !== null
            ? previous[section].map((item, index) =>
                index === selectedIndex ? entry : item,
              )
            : [...previous[section], entry],
      }));
    }
    setDirty(true);
    setResponseView("question");
    setResponse("");
    setResponseKind(null);
    setNotice(
      onSaveProfile
        ? "Change ready to save."
        : "Change added to this local preview. The live profile was not changed.",
    );
    setEditorMode("overview");
    setEntryError("");
  }

  function deleteEntry() {
    if (selectedIndex === null) return;
    if (section === "sources") {
      if (profile.sources.length === 1) {
        setEntryError("Keep at least one source in the character profile.");
        return;
      }
      const id = profile.sources[selectedIndex].id;
      const dependent = [
        ...profile.speechPatterns,
        ...profile.signaturePhrases,
        ...profile.canonReferences,
      ].filter((detail) => detail.sourceIds.includes(id)).length;
      if (dependent) {
        setEntryError(
          `This source supports ${dependent} detail${dependent === 1 ? "" : "s"}. Link those details to another source before deleting it.`,
        );
        return;
      }
      setProfile((previous) => ({
        ...previous,
        sources: previous.sources.filter((_, index) => index !== selectedIndex),
      }));
    } else {
      if (section === "speechPatterns" && profile.speechPatterns.length === 1) {
        setEntryError("Keep at least one speech pattern in the profile.");
        return;
      }
      setProfile((previous) => ({
        ...previous,
        [section]: previous[section].filter(
          (_, index) => index !== selectedIndex,
        ),
      }));
    }
    setDirty(true);
    setResponseView("question");
    setResponse("");
    setResponseKind(null);
    setNotice(
      onSaveProfile
        ? "Change ready to save."
        : "Entry removed from this local preview. The live profile was not changed.",
    );
    setSelectedIndex(null);
    setEditorMode("overview");
    setEntryError("");
  }

  async function testResponse() {
    if (!responseReadiness.ready || !question.trim()) return;
    if (!responseAvailable) {
      setResponse(candidateArt?.exampleResponse ?? exampleResponse);
      setResponseQuestion(exampleQuestion);
      setResponseKind("example");
      setResponseView("answer");
      setResponseError("");
      return;
    }
    setResponsePending(true);
    setResponseError("");
    try {
      const result = await fetch(
        onSaveProfile
          ? "/api/direction/seasons/living/response"
          : "/api/design-review/character-workspace/response",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, quarter, question, profile }),
        },
      );
      const body = (await result.json()) as {
        status?: string;
        reply?: string;
        error?: string;
      };
      if (!result.ok || body.error)
        throw new Error(body.error ?? "The test failed.");
      if (body.status !== "READY" || !body.reply)
        throw new Error("The response is still processing. Try again shortly.");
      setResponse(body.reply);
      setResponseQuestion(question.trim());
      setResponseKind("ai");
      setResponseView("answer");
      play("cotsAnswerReady");
    } catch (error) {
      setResponseError(
        error instanceof Error ? error.message : "The test could not run.",
      );
    } finally {
      setResponsePending(false);
    }
  }

  return (
    <div
      className="character-workspace"
      data-workspace-treatment={candidateArt ? "candidate" : undefined}
    >
      <div className="character-workspace-main">
        {showBanner && (candidateArt ? (
          <CharacterBanner
            headingLevel={onSaveProfile ? 2 : 1}
            content={{
              name: profile.characterName,
              sourceWork: profile.sourceWork,
              adaptation: profile.adaptation,
              desktopSrc: candidateArt.desktopSrc,
              phoneSrc: candidateArt.phoneSrc,
              alt: candidateArt.alt,
              quote: candidateArt.quote,
              attribution: candidateArt.attribution,
              rightLine: candidateArt.rightLine,
            }}
          />
        ) : (
          <section
            className="character-workspace-banner"
            aria-label="Character identity"
          >
            <Image
              src="/design-review/character-workspace-v2/levi-character-banner.png"
              alt="Levi Ackerman turning toward the viewer above a Survey Corps rooftop at dusk"
              fill
              unoptimized
              priority
              sizes="(max-width: 900px) 100vw, 75vw"
            />
            <div className="character-workspace-banner-copy">
              <Badge variant="specimen-strip" area="direction">
                Character of the Season
              </Badge>
              <h1 className="type-page-title">{profile.characterName}</h1>
              <p className="type-body-lg">
                {profile.sourceWork} <span aria-hidden="true">·</span>{" "}
                {profile.adaptation}
              </p>
              <p className="type-body-sm">
                A source-grounded voice for this Season.
              </p>
            </div>
          </section>
        ))}

        <CharacterStepRail
          steps={railSteps}
          selectedId={step}
          onSelect={chooseStep}
        />

        <Card
          as="section"
          spacing="dense"
          className="character-workspace-section"
          key={step}
        >
          {step === "reactions" ? (
            <>
              <header className="character-workspace-section-heading">
                <IconFrame treatment="featured" area="direction">
                  <MessageSquareText />
                </IconFrame>
                <div>
                  <p className="type-overline">STEP 5 OF 5</p>
                  <h2 className="type-section-title">Reactions</h2>
                  <p className="type-body-sm">
                    Describe how this C.O.T.S. responds and how those reactions
                    appear in imagery.
                  </p>
                </div>
              </header>
              <div className="character-workspace-reactions">
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
                        setResponseView("question");
                        setResponse("");
                        setResponseKind(null);
                      }}
                    />
                  </FieldLabel>
                ))}
              </div>
            </>
          ) : (
            <>
              <header className="character-workspace-section-heading">
                <IconFrame treatment="featured" area="direction">
                  <BookOpen />
                </IconFrame>
                <div>
                  <h2 className="type-section-title">{currentSection.label}</h2>
                  <p className="type-body-sm">{currentSection.description}</p>
                </div>
              </header>

              <div className="character-workspace-section-body">
                <div className="character-workspace-entry-pane">
                  {candidateArt && (
                    <div className="character-workspace-entry-heading">
                      <span className="type-overline">SAVED RECORDS</span>
                      <span className="type-caption">
                        {entries.length}{" "}
                        {entries.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  )}
                  <div
                    className="character-workspace-entry-list"
                    aria-label={`${currentSection.label} entries`}
                  >
                    {entries.length ? (
                      entries.map((_, index) => {
                        const title =
                          section === "sources"
                            ? profile.sources[index].title
                            : profile[section][index].description;
                        const secondary =
                          section === "sources"
                            ? sourceHost(profile.sources[index].url)
                            : (profile.sources.find((source) =>
                                profile[section][index].sourceIds.includes(
                                  source.id,
                                ),
                              )?.title ?? "Source link missing");
                        return (
                          <button
                            type="button"
                            className="character-workspace-entry"
                            aria-pressed={
                              selectedIndex === index && editorMode === "edit"
                            }
                            data-selected={
                              selectedIndex === index && editorMode === "edit"
                            }
                            onClick={() => openEdit(index)}
                            key={
                              section === "sources"
                                ? profile.sources[index].id
                                : `${section}-${index}`
                            }
                          >
                            {candidateArt ? (
                              <span className="character-workspace-entry-index type-overline">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            ) : (
                              <IconFrame treatment="compact" area="direction">
                                <FileText />
                              </IconFrame>
                            )}
                            <span>
                              <strong className="type-label">{title}</strong>
                              <small className="type-caption">
                                {secondary}
                              </small>
                            </span>
                            <ChevronRight aria-hidden="true" />
                          </button>
                        );
                      })
                    ) : (
                      <p className="character-workspace-empty type-body-sm">
                        No {currentSection.label.toLowerCase()} yet. You can add
                        the first one here.
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className="character-workspace-detail"
                  data-mode={editorMode}
                  ref={editorRef}
                >
                  <div
                    className="character-workspace-explainer"
                    inert={editorMode !== "overview"}
                    aria-hidden={editorMode !== "overview"}
                  >
                    <CharacterInfluenceExplainer
                      section={currentSection}
                      sectionNumber={
                        CHARACTER_WORKSPACE_SECTIONS.findIndex(
                          (item) => item.id === section,
                        ) + 1
                      }
                      linkedCount={sectionLinked}
                      entryCount={entries.length}
                      onAdd={openAdd}
                    />
                  </div>

                  <form
                    className="character-workspace-form"
                    inert={editorMode === "overview"}
                    aria-hidden={editorMode === "overview"}
                    onSubmit={saveEntry}
                  >
                    <div className="character-workspace-form-heading">
                      <div>
                        <p className="type-overline">
                          {editorMode === "edit" ? "EDIT ENTRY" : "NEW ENTRY"}
                        </p>
                        <h3 className="type-section-title">
                          {editorMode === "edit"
                            ? `Edit ${currentSection.singular}`
                            : addLabel}
                        </h3>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditorMode("overview");
                          setEntryError("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    {section === "sources" ? (
                      <>
                        <FieldLabel>
                          Source title
                          <Input
                            ref={firstFieldRef as Ref<HTMLInputElement>}
                            required
                            maxLength={300}
                            value={draft.title}
                            onChange={(event) =>
                              setDraft((prior) => ({
                                ...prior,
                                title: event.target.value,
                              }))
                            }
                          />
                        </FieldLabel>
                        <FieldLabel>
                          Source URL{" "}
                          <span className="type-caption">Optional</span>
                          <Input
                            type="url"
                            value={draft.url}
                            onChange={(event) =>
                              setDraft((prior) => ({
                                ...prior,
                                url: event.target.value,
                              }))
                            }
                            placeholder="https://"
                          />
                        </FieldLabel>
                        <FieldLabel>
                          What this source establishes
                          <Textarea
                            required
                            maxLength={1000}
                            value={draft.notes}
                            onChange={(event) =>
                              setDraft((prior) => ({
                                ...prior,
                                notes: event.target.value,
                              }))
                            }
                          />
                        </FieldLabel>
                      </>
                    ) : (
                      <>
                        <FieldLabel>
                          Description
                          <Textarea
                            ref={firstFieldRef as Ref<HTMLTextAreaElement>}
                            required
                            maxLength={600}
                            value={draft.description}
                            onChange={(event) =>
                              setDraft((prior) => ({
                                ...prior,
                                description: event.target.value,
                              }))
                            }
                          />
                        </FieldLabel>
                        <fieldset className="character-workspace-source-choices">
                          <legend className="type-label">
                            Supporting sources
                          </legend>
                          {profile.sources.map((source) => (
                            <SelectionLabel key={source.id}>
                              <Checkbox
                                checked={draft.sourceIds.includes(source.id)}
                                onChange={(event) =>
                                  setDraft((prior) => ({
                                    ...prior,
                                    sourceIds: event.target.checked
                                      ? [...prior.sourceIds, source.id]
                                      : prior.sourceIds.filter(
                                          (id) => id !== source.id,
                                        ),
                                  }))
                                }
                              />
                              <span className="type-body-sm">
                                {source.title}
                              </span>
                            </SelectionLabel>
                          ))}
                        </fieldset>
                      </>
                    )}
                    {entryError && <FieldError>{entryError}</FieldError>}
                    <div className="character-workspace-form-actions">
                      <Button type="submit">
                        {editorMode === "edit" ? "Save changes" : addLabel}{" "}
                        <ArrowRight aria-hidden="true" />
                      </Button>
                      {editorMode === "edit" && (
                        <Button
                          type="button"
                          variant="danger"
                          onClick={deleteEntry}
                        >
                          <Trash2 aria-hidden="true" /> Delete
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
          {notice && (
            <p
              className="character-workspace-notice type-caption"
              role="status"
            >
              {notice}
            </p>
          )}
          {onSaveProfile && (
            <>
              <div className="character-workspace-live-actions">
                <Button
                  disabled={busy || !dirty}
                  onClick={async () => {
                    if (await onSaveProfile(profile)) {
                      setDirty(false);
                      setNotice(
                        "Profile revision saved. Review it before approval.",
                      );
                    }
                  }}
                >
                  Save profile revision
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || dirty || approved || !profileId}
                  onClick={async () => {
                    if (
                      profileId &&
                      onApproveProfile &&
                      (await onApproveProfile(profileId))
                    )
                      setNotice("Profile approved.");
                  }}
                >
                  Approve profile
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <aside
        className="character-workspace-sidebar"
        aria-label="Character profile context"
      >
        <Card
          as="section"
          spacing="dense"
          className="character-workspace-status"
        >
          <div className="character-workspace-side-title">
            <IconFrame treatment="compact" area="direction">
              <ShieldCheck />
            </IconFrame>
            <h2 className="type-widget-title">Character status</h2>
            <Badge variant="live-numeral" area="direction">
              {dirty
                ? "Edited locally"
                : active
                  ? "Active"
                  : approved
                    ? "Approved"
                    : "Draft"}
            </Badge>
          </div>
          <div className="character-workspace-measure">
            <div>
              <strong className="type-label">Source fields complete</strong>
              <span className="type-label">
                {metrics.describedSources}/{metrics.sourceCount}
              </span>
            </div>
            <ProgressIndicator
              variant="plasma-core"
              area="direction"
              value={metrics.sourceCompleteness}
              label="Source fields complete"
            />
          </div>
          <div className="character-workspace-measure">
            <div>
              <strong className="type-label">Details with source links</strong>
              <span className="type-label">
                {metrics.linkedDetails}/{metrics.detailCount}
              </span>
            </div>
            <ProgressIndicator
              variant="plasma-core"
              area="direction"
              value={metrics.citationCoverage ?? 0}
              label="Details with source links"
            />
          </div>
          <p className="type-caption">
            These bars measure record completeness and citation links. Canon
            accuracy needs human review.
          </p>
        </Card>

        <Card
          as="section"
          spacing="dense"
          className="character-workspace-quick-info"
        >
          <div className="character-workspace-side-title">
            <IconFrame treatment="compact" area="direction">
              <Info />
            </IconFrame>
            <h2 className="type-widget-title">Quick info</h2>
          </div>
          <dl>
            <div>
              <dt className="type-caption">Series</dt>
              <dd className="type-body-sm">{profile.sourceWork}</dd>
            </div>
            <div>
              <dt className="type-caption">Medium</dt>
              <dd className="type-body-sm">
                {profile.adaptation || "Unspecified"}
              </dd>
            </div>
            <div>
              <dt className="type-caption">Messages</dt>
              <dd className="type-body-sm">English</dd>
            </div>
            <div>
              <dt className="type-caption">Saved version</dt>
              <dd className="type-body-sm">
                {version}
                {dirty ? " · local edits" : ""}
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          as="section"
          spacing="dense"
          material="elevated-glass"
          className="character-workspace-test"
          aria-label={
            candidateArt
              ? `Preview ${profile.characterName}`
              : "Preview C.O.T.S."
          }
        >
          <div className="character-workspace-test-header">
            <div className="character-workspace-side-title">
              <IconFrame treatment="compact" area="direction">
                <MessageSquareText />
              </IconFrame>
              <h2 className="type-widget-title">
                {candidateArt
                  ? `Preview ${profile.characterName}`
                  : "Preview C.O.T.S."}
              </h2>
            </div>
            {responseView === "answer" && !candidateArt && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={responsePending}
                onClick={
                  responseAvailable
                    ? testResponse
                    : () => setResponseView("question")
                }
              >
                {responsePending ? (
                  <LoadingIndicator
                    label="Generating test response"
                    area="direction"
                  />
                ) : (
                  <Play aria-hidden="true" />
                )}
                {responseAvailable ? "Test response" : "Ask another"}
              </Button>
            )}
          </div>
          {responseView === "question" ? (
            <>
              <FieldLabel>
                Ask a test question
                <Input
                  value={question}
                  maxLength={1000}
                  onChange={(event) => setQuestion(event.target.value)}
                />
              </FieldLabel>
              <Button
                type="button"
                disabled={
                  !responseReadiness.ready ||
                  responsePending ||
                  !question.trim() ||
                  (!responseAvailable && question.trim() !== exampleQuestion)
                }
                onClick={testResponse}
              >
                {responsePending ? (
                  <LoadingIndicator
                    label="Generating test response"
                    area="direction"
                  />
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
                Test response
              </Button>
              {responseError && <FieldError>{responseError}</FieldError>}
              {!responseReadiness.ready ? (
                <p className="type-caption">
                  Add {responseReadiness.missing.join(", ")} before previewing
                  this character.
                </p>
              ) : !responseAvailable ? (
                <p className="type-caption">
                  No AI model is connected yet. Test response shows a labeled
                  example; your own question needs a model and API key in
                  Settings → Nexo.
                </p>
              ) : (
                <p className="type-caption">
                  Uses your configured C.O.T.S. model and this editable draft.
                </p>
              )}
            </>
          ) : (
            <div
              className="character-workspace-test-result"
              ref={responseResultRef}
              tabIndex={-1}
            >
              <div className="character-workspace-test-question type-body-sm">
                <CircleHelp aria-hidden="true" />
                <span>{responseQuestion}</span>
              </div>
              <div className="character-workspace-answer">
                {candidateArt && avatarSource ? (
                  <button
                    type="button"
                    className="character-workspace-answer-avatar character-workspace-answer-avatar-edit"
                    aria-label={`Adjust ${profile.characterName}'s profile picture`}
                    disabled={Boolean(onSaveProfile && !onAvatarApply)}
                    onClick={() => setAvatarEditorOpen(true)}
                  >
                    <Image
                      src={avatarSource}
                      alt=""
                      width={128}
                      height={128}
                      unoptimized
                      style={avatarImageStyle(avatarPlacement)}
                    />
                    <span
                      className="character-workspace-answer-avatar-affordance"
                      aria-hidden="true"
                    >
                      <Pencil />
                    </span>
                  </button>
                ) : candidateArt ? (
                  <span
                    className="character-workspace-answer-avatar"
                    aria-hidden="true"
                  >
                    <UserRound />
                  </span>
                ) : (
                  <span
                    className="character-workspace-answer-avatar"
                    aria-hidden="true"
                  >
                    <Image
                      src="/design-review/character-workspace-v2/levi-character-banner.png"
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                    />
                  </span>
                )}
                <div
                  className="character-workspace-answer-bubble"
                  role="status"
                >
                  <AiTypingText
                    key={response}
                    text={response}
                    speaker={candidateArt ? profile.characterName : "C.O.T.S"}
                    showFull={responseKind === "example"}
                  />
                </div>
              </div>
              <p className="type-caption character-workspace-test-note">
                {responseKind === "example"
                  ? question.trim() === exampleQuestion
                    ? "Example only · AI is not connected. Add a model and API key to test your own question."
                    : "Example only · AI is not connected. This answers the sample question, not your custom question."
                  : "Generated from this character draft and the available Season facts."}
              </p>
              {responseError && <FieldError>{responseError}</FieldError>}
              {candidateArt ? (
                <Button
                  type="button"
                  className="character-workspace-ask-another"
                  onClick={() => setResponseView("question")}
                >
                  Ask another question <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setResponseView("question")}
                >
                  Edit question <ArrowRight aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card
          as="section"
          spacing="dense"
          className="character-workspace-footnote"
        >
          <BookOpen aria-hidden="true" />
          <p className="type-body">
            A grounded character makes better conversations.
          </p>
          <span className="type-label">— Become</span>
        </Card>
      </aside>
      {candidateArt && avatarEditorOpen && (
        <CharacterAvatarEditor
          name={profile.characterName}
          source={avatarSource}
          generatedSource={
            candidateArt.generatedAvatarSrc ??
            candidateArt.avatarSrc ??
            avatarSource
          }
          previewOnly={!onAvatarApply}
          persistenceHint={avatarPersistenceHint}
          placement={avatarPlacement}
          onClose={() => setAvatarEditorOpen(false)}
          onApply={async (source, placement, file) => {
            if (
              onAvatarApply &&
              !(await onAvatarApply(source, placement, file))
            )
              return false;
            setAvatarOverride({
              baseSource: baseAvatarSource,
              source,
              placement,
            });
            setAvatarEditorOpen(false);
            return true;
          }}
        />
      )}
    </div>
  );
}
