"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crop,
  Plus,
  RotateCcw,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import type { OwnedOption } from "@/features/direction/types/direction.types";
import { searchDirectionOptions } from "@/features/direction/options/utils/direction-option-client.util";
import { SeasonPoster } from "@/features/seasons/posters/components/season-poster.component";
import { useSeasonDraftSave } from "@/features/seasons/opening/hooks/use-season-draft-save.hook";
import { CotsOpeningWorkspace } from "@/features/seasons/discovery/components/cots-opening-workspace.component";
import { cotsCategory } from "@/features/seasons/discovery/constants/cots-category.constants";
import { COTS_IMPORTS_QUEUED_EVENT } from "@/features/seasons/discovery/constants/cots-events.constants";
import type {
  CotsCollectionView,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import type {
  SeasonDraft,
  SeasonStandard,
  SeasonView,
} from "@/features/seasons/types/season.types";
import { SeasonOpeningPrelude } from "@/features/seasons/opening/components/season-opening-prelude.component";
import {
  SeasonGoalCreator,
  type SeasonGoalPlacement,
} from "@/features/seasons/opening/components/season-goal-creator.component";
import { SeasonSupportingGoals } from "@/features/seasons/opening/components/season-supporting-goals.component";
import { SeasonCardPlacementEditor } from "@/features/seasons/opening/components/season-card-placement-editor.component";
import {
  seasonImagePosition,
  type SeasonImagePosition,
} from "@/features/seasons/posters/utils/season-image-position.util";
import "@/features/seasons/opening/styles/season-opening-ritual.css";

const stages = [
  {
    number: 1,
    label: "Open the season",
    description: "Name what deserves to cross the threshold with you.",
  },
  {
    number: 2,
    label: "Choose direction",
    description: "Give the months ahead a clear through-line.",
  },
  {
    number: 3,
    label: "Choose your inspiration",
    description: "Choose a standard to return to when intention is tested.",
  },
  {
    number: 4,
    label: "See the season",
    description: "See the season as one whole before you step into it.",
  },
] as const;

function toGoalOption(goal: SeasonView["goals"][number]["goal"]): OwnedOption {
  return {
    id: goal.id,
    name: goal.title,
    description: goal.targetOn
      ? `${goal.startOn} — ${goal.targetOn}`
      : `Since ${goal.startOn} · open ended`,
  };
}

function draftFromSeason(season: SeasonView): SeasonDraft {
  return {
    title: season.title,
    intention: season.intention,
    answers: {
      ...season.answers,
      deferredSteps: [...season.answers.deferredSteps],
    },
    character: {
      ...season.character,
      standards: season.character.standards.map((standard) => ({
        ...standard,
      })),
    },
    stage: Math.min(4, Math.max(1, season.stage || 1)),
  };
}

function assignmentsFromSeason(season: SeasonView) {
  const primaryGoal = season.goals.find(({ role }) => role === "PRIMARY")?.goal;
  const primary = primaryGoal ? toGoalOption(primaryGoal) : null;
  const supporting = season.goals
    .filter(({ role }) => role === "SUPPORTING")
    .map(({ goal }) => toGoalOption(goal));
  const supportNotes = Object.fromEntries(
    season.goals
      .filter(({ role }) => role === "SUPPORTING")
      .map(({ goal, note }) => [goal.id, note]),
  );
  return { primary, supporting, supportNotes };
}

function assignmentFingerprint(
  primary: ReusableEntityOption | null,
  supporting: ReusableEntityOption[],
  supportNotes: Record<string, string>,
) {
  return JSON.stringify({
    primary: primary?.id ?? "",
    supporting: supporting.map(({ id }) => ({
      id,
      note: supportNotes[id]?.trim() ?? "",
    })),
  });
}

function writableFingerprint(
  draft: SeasonDraft,
  assignment: ReturnType<typeof assignmentsFromSeason>,
) {
  return JSON.stringify({
    draft,
    assignment: assignmentFingerprint(
      assignment.primary,
      assignment.supporting,
      assignment.supportNotes,
    ),
  });
}

function isSeasonView(value: unknown): value is SeasonView {
  if (!value || typeof value !== "object") return false;
  const season = value as Partial<SeasonView>;
  return (
    Number.isSafeInteger(season.version) &&
    typeof season.year === "number" &&
    typeof season.quarter === "number" &&
    typeof season.title === "string" &&
    typeof season.intention === "string" &&
    typeof season.stage === "number" &&
    Boolean(season.answers && typeof season.answers === "object") &&
    Boolean(season.character && typeof season.character === "object") &&
    Array.isArray(season.goals)
  );
}

async function fetchCurrentSeason(year: number, quarter: number) {
  try {
    const response = await fetch(`/api/direction/seasons/${year}/${quarter}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const body = await response.json().catch(() => null);
    if (response.ok && isSeasonView(body)) return { season: body, error: null };
    return {
      season: null,
      error:
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : "The current saved season could not be loaded. Try again.",
    };
  } catch {
    return {
      season: null,
      error: "The current saved season could not be loaded. Try again.",
    };
  }
}

function changedSeasonAreas(
  localDraft: SeasonDraft,
  savedDraft: SeasonDraft,
  localAssignment: ReturnType<typeof assignmentsFromSeason>,
  savedAssignment: ReturnType<typeof assignmentsFromSeason>,
) {
  const areas: string[] = [];
  if (
    localDraft.title !== savedDraft.title ||
    localDraft.intention !== savedDraft.intention
  )
    areas.push("season framing");
  if (JSON.stringify(localDraft.answers) !== JSON.stringify(savedDraft.answers))
    areas.push("opening reflections");
  if (localDraft.stage !== savedDraft.stage) areas.push("opening stage");
  if (
    JSON.stringify({ ...localDraft.character, standards: undefined }) !==
    JSON.stringify({ ...savedDraft.character, standards: undefined })
  )
    areas.push("character");
  if (
    JSON.stringify(localDraft.character.standards) !==
    JSON.stringify(savedDraft.character.standards)
  )
    areas.push("character standards");
  if (localAssignment.primary?.id !== savedAssignment.primary?.id)
    areas.push("main direction");
  if (
    assignmentFingerprint(
      null,
      localAssignment.supporting,
      localAssignment.supportNotes,
    ) !==
    assignmentFingerprint(
      null,
      savedAssignment.supporting,
      savedAssignment.supportNotes,
    )
  )
    areas.push("supporting goals or notes");
  return areas;
}

function reviewFields(
  draft: SeasonDraft,
  assignment: ReturnType<typeof assignmentsFromSeason>,
) {
  const value = (text: string) => text.trim() || "Not set";
  return [
    ["Season title", value(draft.title)],
    ["Opening intention", value(draft.intention)],
    ["Opening stage", stages[draft.stage - 1]?.label ?? "Open the season"],
    ["Carry forward", value(draft.answers.carryForward)],
    ["Leave behind", value(draft.answers.leaveBehind)],
    ["Meaningful if", value(draft.answers.meaningful)],
    ["Protect", value(draft.answers.protect)],
    ["Character", value(draft.character.name)],
    [
      "Source category",
      cotsCategory(draft.character.sourceCategory)?.label ?? "Not set",
    ],
    ["Source work", value(draft.character.sourceWork)],
    ["Adaptation", value(draft.character.adaptation)],
    ["What you admire", value(draft.character.motivation)],
    ["What not to emulate", value(draft.character.avoid)],
    ["Accountability tone", draft.character.tone],
    [
      "Character standards",
      draft.character.standards
        .map(
          ({ trait, behavior }) =>
            `${value(trait)}${behavior.trim() ? ` — ${behavior.trim()}` : ""}`,
        )
        .join("\n") || "None chosen",
    ],
    ["Main direction", assignment.primary?.name ?? "None chosen"],
    [
      "Supporting goals",
      assignment.supporting
        .map(({ id, name }) => {
          const note = assignment.supportNotes[id]?.trim();
          return `${name}${note ? ` — ${note}` : ""}`;
        })
        .join("\n") || "None chosen",
    ],
  ] as const;
}

export function SeasonOpening({
  season,
  goalOptions,
  domainOptions,
  defaultGoalStartOn,
  arrival = false,
}: {
  season: SeasonView;
  goalOptions: OwnedOption[];
  domainOptions: OwnedOption[];
  defaultGoalStartOn: string;
  arrival?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const createGoalButtonRef = useRef<HTMLButtonElement>(null);
  const editCardButtonRef = useRef<HTMLButtonElement>(null);
  const ritualTitleRef = useRef<HTMLHeadingElement>(null);
  const initialDraft = draftFromSeason(season);
  const initialAssignment = assignmentsFromSeason(season);
  const queuedDraftFingerprint = useRef(JSON.stringify(initialDraft));
  const latestDraft = useRef<SeasonDraft>(initialDraft);
  const previousStage = useRef(initialDraft.stage);
  const [draft, setDraft] = useState<SeasonDraft>(initialDraft);
  const [supporting, setSupporting] = useState<ReusableEntityOption[]>(
    initialAssignment.supporting,
  );
  const [primary, setPrimary] = useState<ReusableEntityOption | null>(
    initialAssignment.primary,
  );
  const [supportNotes, setSupportNotes] = useState<Record<string, string>>(
    initialAssignment.supportNotes,
  );
  const [reviewedSeason, setReviewedSeason] = useState<SeasonView | null>(null);
  const [reviewPending, setReviewPending] = useState(true);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [selectionReset, setSelectionReset] = useState(0);
  const [goalCreatorOpen, setGoalCreatorOpen] = useState(false);
  const [goalPlacement, setGoalPlacement] =
    useState<SeasonGoalPlacement>("PRIMARY");
  const [deferringArrival, setDeferringArrival] = useState(false);
  const [arrivalError, setArrivalError] = useState<string | null>(null);
  const [checkingCompletion, setCheckingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionGate, setCompletionGate] = useState<{
    selection: CotsSelectionView;
    pendingCount: number;
    failedCount: number;
  } | null>(null);
  const [cardPlacementOpen, setCardPlacementOpen] = useState(false);
  const [cardPlacementSaving, setCardPlacementSaving] = useState(false);
  const [cardPlacementError, setCardPlacementError] = useState<string | null>(
    null,
  );
  const [cardPlacementNotice, setCardPlacementNotice] = useState<string | null>(
    null,
  );
  const [cardPlacementOverride, setCardPlacementOverride] = useState<{
    mediaId: string;
    position: SeasonImagePosition;
  } | null>(null);
  const [preludeActive, setPreludeActive] = useState(
    arrival && initialDraft.stage === 1,
  );
  const preludeWasShown = useRef(preludeActive);
  const loadedSavedVersion = useRef<number | null>(null);
  const {
    acceptReviewedVersion,
    assignGoals,
    fieldErrors,
    requireReview,
    result,
    saveDraft,
    state,
    version,
  } = useSeasonDraftSave(season);
  const markSaved = useRecordFormGuard(formRef);
  const featuredPoster = season.media.find(({ poster }) => poster);
  const cardImagePosition = featuredPoster
    ? cardPlacementOverride?.mediaId === featuredPoster.id
      ? cardPlacementOverride.position
      : seasonImagePosition(featuredPoster.focalX, featuredPoster.focalY)
    : null;

  const completePrelude = useCallback(() => setPreludeActive(false), []);

  useEffect(() => {
    if (!preludeWasShown.current || preludeActive) return;
    preludeWasShown.current = false;
    const frame = window.requestAnimationFrame(() =>
      ritualTitleRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [preludeActive]);

  const patchDraft = useCallback((patch: Partial<SeasonDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const patchAnswers = useCallback((patch: Partial<SeasonDraft["answers"]>) => {
    setDraft((current) => ({
      ...current,
      answers: { ...current.answers, ...patch },
    }));
  }, []);

  const patchCharacter = useCallback(
    (patch: Partial<SeasonDraft["character"]>) => {
      setDraft((current) => ({
        ...current,
        character: { ...current.character, ...patch },
      }));
    },
    [],
  );

  useEffect(() => {
    latestDraft.current = draft;
  }, [draft]);

  useEffect(() => {
    if (previousStage.current === draft.stage) return;
    previousStage.current = draft.stage;
    formRef.current
      ?.querySelector<HTMLElement>(".season-opening-stage:not([hidden]) h2")
      ?.focus();
  }, [draft.stage]);

  const saveSnapshot = useCallback(
    (snapshot: SeasonDraft, complete = false) => saveDraft(snapshot, complete),
    [saveDraft],
  );

  const assignmentSnapshot = useMemo(
    () => ({
      primary,
      supporting,
      supportNotes,
      fingerprint: assignmentFingerprint(primary, supporting, supportNotes),
    }),
    [primary, supporting, supportNotes],
  );
  const latestAssignment = useRef(assignmentSnapshot);
  const latestAssignmentFingerprint = useRef(assignmentSnapshot.fingerprint);
  const autosaveBlocked =
    reviewPending || state === "conflict" || Boolean(reviewedSeason);

  useEffect(() => {
    latestAssignment.current = assignmentSnapshot;
  }, [assignmentSnapshot]);

  const reviewCurrentSeason = useCallback(
    async (explicit = false) => {
      setReviewPending(true);
      setReviewError(null);
      if (explicit) setReviewNotice(null);
      const current = await fetchCurrentSeason(season.year, season.quarter);
      setReviewPending(false);
      if (!current.season) {
        if (explicit) setReviewError(current.error);
        return;
      }
      if (current.season.version < version.current) {
        if (explicit)
          setReviewNotice(
            "Your local save is already newer than that response. Try reviewing again.",
          );
        return;
      }

      const savedDraft = draftFromSeason(current.season);
      const savedAssignment = assignmentsFromSeason(current.season);
      const localAssignment = latestAssignment.current;
      if (
        writableFingerprint(latestDraft.current, localAssignment) ===
        writableFingerprint(savedDraft, savedAssignment)
      ) {
        queuedDraftFingerprint.current = JSON.stringify(latestDraft.current);
        latestAssignmentFingerprint.current = localAssignment.fingerprint;
        if (!acceptReviewedVersion(current.season.version)) {
          if (explicit)
            setReviewError(
              "A save is still being resolved. Wait a moment, then review again.",
            );
          return;
        }
        setReviewedSeason(null);
        if (explicit)
          setReviewNotice(
            "The saved season matches your entries. You can try that action again.",
          );
        return;
      }

      setReviewedSeason(current.season);
      requireReview(
        "This season has newer saved changes. Your entries are preserved while you review them.",
      );
    },
    [
      acceptReviewedVersion,
      requireReview,
      season.quarter,
      season.year,
      version,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void reviewCurrentSeason(), 0);
    return () => window.clearTimeout(timer);
  }, [reviewCurrentSeason]);

  function keepEntriesAfterReview() {
    if (!reviewedSeason) return;
    queuedDraftFingerprint.current = JSON.stringify(latestDraft.current);
    latestAssignmentFingerprint.current = latestAssignment.current.fingerprint;
    if (!acceptReviewedVersion(reviewedSeason.version)) {
      setReviewError("A newer save arrived. Review the current version again.");
      return;
    }
    setReviewedSeason(null);
    setReviewError(null);
    setReviewNotice(
      "Your entries are ready. Save or continue to apply them to the current season.",
    );
  }

  function loadSavedVersion() {
    if (!reviewedSeason) return;
    if (!acceptReviewedVersion(reviewedSeason.version)) {
      setReviewError("A newer save arrived. Review the current version again.");
      return;
    }
    const savedDraft = draftFromSeason(reviewedSeason);
    const savedAssignment = assignmentsFromSeason(reviewedSeason);
    queuedDraftFingerprint.current = JSON.stringify(savedDraft);
    latestDraft.current = savedDraft;
    latestAssignment.current = {
      ...savedAssignment,
      fingerprint: assignmentFingerprint(
        savedAssignment.primary,
        savedAssignment.supporting,
        savedAssignment.supportNotes,
      ),
    };
    latestAssignmentFingerprint.current = latestAssignment.current.fingerprint;
    loadedSavedVersion.current = reviewedSeason.version;
    setDraft(savedDraft);
    setPrimary(savedAssignment.primary);
    setSupporting(savedAssignment.supporting);
    setSupportNotes(savedAssignment.supportNotes);
    setSelectionReset((current) => current + 1);
    setReviewedSeason(null);
    setReviewError(null);
    setReviewNotice("The current saved season is now loaded in this form.");
  }

  useEffect(() => {
    if (loadedSavedVersion.current === null) return;
    loadedSavedVersion.current = null;
    const frame = window.requestAnimationFrame(markSaved);
    return () => window.cancelAnimationFrame(frame);
  }, [assignmentSnapshot.fingerprint, draft, markSaved]);

  useEffect(() => {
    if (autosaveBlocked) return;
    const fingerprint = JSON.stringify(draft);
    if (queuedDraftFingerprint.current === fingerprint) return;
    queuedDraftFingerprint.current = fingerprint;
    const snapshot = draft;
    const timer = window.setTimeout(() => {
      void saveSnapshot(snapshot).then((response) => {
        if (
          !response.error &&
          snapshot.stage !== 2 &&
          latestDraft.current === snapshot
        )
          markSaved();
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [autosaveBlocked, draft, markSaved, saveSnapshot]);

  const saveGoalAssignments = useCallback(
    async (snapshot: typeof assignmentSnapshot) => {
      const primaryGoalId = snapshot.primary?.id ?? "";
      if (
        primaryGoalId &&
        snapshot.supporting.some(({ id }) => id === primaryGoalId)
      ) {
        return { error: "The main goal cannot also be a supporting goal." };
      }
      const goals = [
        ...(primaryGoalId
          ? [{ goalId: primaryGoalId, role: "PRIMARY" as const, note: "" }]
          : []),
        ...snapshot.supporting.map(({ id }) => ({
          goalId: id,
          role: "SUPPORTING" as const,
          note: snapshot.supportNotes[id]?.trim() ?? "",
        })),
      ];
      return assignGoals(goals);
    },
    [assignGoals],
  );

  useEffect(() => {
    if (autosaveBlocked) return;
    if (latestAssignmentFingerprint.current === assignmentSnapshot.fingerprint)
      return;
    latestAssignmentFingerprint.current = assignmentSnapshot.fingerprint;
    if (draft.stage !== 2) return;
    const snapshot = assignmentSnapshot;
    const timer = window.setTimeout(() => {
      void saveGoalAssignments(snapshot).then((response) => {
        if (
          !response.error &&
          latestAssignmentFingerprint.current === snapshot.fingerprint &&
          latestDraft.current.stage === 2
        )
          markSaved();
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [
    assignmentSnapshot,
    draft.stage,
    markSaved,
    saveGoalAssignments,
    autosaveBlocked,
  ]);

  async function persist(next: SeasonDraft, complete = false) {
    setDraft(next);
    const saved = await saveSnapshot(next, complete);
    if (saved.error) return saved;
    if (draft.stage === 2) {
      const assigned = await saveGoalAssignments(assignmentSnapshot);
      if (!assigned.error) markSaved();
      return assigned;
    }
    markSaved();
    return saved;
  }

  async function moveTo(stage: number, defer = false) {
    const deferred = defer
      ? [...new Set([...draft.answers.deferredSteps, draft.stage])]
      : draft.answers.deferredSteps.filter((value) => value !== draft.stage);
    const next = {
      ...draft,
      stage,
      answers: { ...draft.answers, deferredSteps: deferred },
    };
    const response = await persist(next, stage === 4 && draft.stage === 4);
    if (!response.error && stage === 4 && draft.stage === 4) {
      router.push(`/direction/seasons/${season.year}/${season.quarter}`);
      router.refresh();
    } else if (!response.error) {
      router.replace(
        `/direction/seasons/${season.year}/${season.quarter}/opening`,
        { scroll: false },
      );
    }
  }

  async function saveAndLeave() {
    const response = await persist(draft);
    if (!response.error) {
      router.push(`/direction/seasons/${season.year}/${season.quarter}`);
      router.refresh();
    }
  }

  async function deferAutomaticOpening() {
    setDeferringArrival(true);
    setArrivalError(null);
    try {
      const saved = await persist(draft);
      if (saved.error) {
        setArrivalError(saved.error);
        setDeferringArrival(false);
        return;
      }
      const response = await fetch("/api/direction/cots", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "DEFER_OPENING",
          year: season.year,
          quarter: season.quarter,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(
          body?.error || "Become could not remember that choice yet.",
        );
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setArrivalError(
        cause instanceof Error
          ? cause.message
          : "Become could not remember that choice yet.",
      );
      setDeferringArrival(false);
    }
  }

  async function returnToCots(subview: "images" | "words" | "finalize") {
    const next = { ...draft, stage: 3 };
    const response = await persist(next);
    if (!response.error) {
      router.replace(
        `/direction/seasons/${season.year}/${season.quarter}/opening?cots=${subview}`,
        { scroll: false },
      );
    }
  }

  async function cotsPost(payload: Record<string, unknown>) {
    const response = await fetch("/api/direction/cots", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        year: season.year,
        quarter: season.quarter,
        ...payload,
      }),
    });
    const body = (await response.json().catch(() => null)) as
      | ({
          collection?: CotsCollectionView;
          pendingCount?: number;
          failedCount?: number;
          error?: string;
        } & Partial<CotsCollectionView>)
      | null;
    if (!response.ok)
      throw new Error(body?.error || "The collection could not be checked.");
    return body;
  }

  function openCardPlacement() {
    if (!featuredPoster || !cardImagePosition) return;
    setCardPlacementError(null);
    setCardPlacementNotice(null);
    setCardPlacementOpen(true);
  }

  function cancelCardPlacement() {
    setCardPlacementError(null);
    setCardPlacementOpen(false);
    window.requestAnimationFrame(() => editCardButtonRef.current?.focus());
  }

  async function saveCardPlacement(position: SeasonImagePosition) {
    if (!featuredPoster) return;
    setCardPlacementSaving(true);
    setCardPlacementError(null);
    try {
      const currentResponse = await fetch(
        `/api/direction/cots?year=${season.year}&quarter=${season.quarter}`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );
      const current = (await currentResponse.json().catch(() => null)) as
        (Partial<CotsCollectionView> & { error?: string }) | null;
      if (
        !currentResponse.ok ||
        !current ||
        typeof current.selectionRevision !== "number" ||
        !Number.isSafeInteger(current.selectionRevision)
      )
        throw new Error(
          current?.error || "The current image placement could not be loaded.",
        );
      const nextPosition = seasonImagePosition(
        Number(position.x.toFixed(4)),
        Number(position.y.toFixed(4)),
      );
      await cotsPost({
        action: "MEDIA_PREFERENCES",
        mediaId: featuredPoster.id,
        focalX: nextPosition.x,
        focalY: nextPosition.y,
        expectedSelectionRevision: current.selectionRevision,
      });
      setCardPlacementOverride({
        mediaId: featuredPoster.id,
        position: nextPosition,
      });
      setCardPlacementOpen(false);
      setCardPlacementNotice(
        "Image placement saved. Your dashboard card is updated too.",
      );
      router.refresh();
      window.requestAnimationFrame(() => editCardButtonRef.current?.focus());
    } catch (cause) {
      setCardPlacementError(
        cause instanceof Error
          ? cause.message
          : "Become could not save this image placement.",
      );
    } finally {
      setCardPlacementSaving(false);
    }
  }

  async function completeOpening(beginWithCurrentPoster = false) {
    setCheckingCompletion(true);
    setCompletionError(null);
    try {
      const result = await cotsPost({
        action: "PREFLIGHT",
        beginWithCurrentPoster,
      });
      const collection = result?.collection;
      const desired = collection?.selections.find(
        ({ desiredPoster }) => desiredPoster,
      );
      if (!beginWithCurrentPoster && desired && desired.status !== "READY") {
        setCompletionGate({
          selection: desired,
          pendingCount: result?.pendingCount ?? 0,
          failedCount: result?.failedCount ?? 0,
        });
        return;
      }
      setCompletionGate(null);
      await moveTo(4);
    } catch (cause) {
      setCompletionError(
        cause instanceof Error
          ? cause.message
          : "The collection could not be checked.",
      );
    } finally {
      setCheckingCompletion(false);
    }
  }

  async function retryCompletionPoster() {
    if (!completionGate) return;
    setCheckingCompletion(true);
    setCompletionError(null);
    try {
      const result = await cotsPost({
        action: "RETRY",
        selectionId: completionGate.selection.id,
      });
      const collection =
        result && "selectionRevision" in result
          ? (result as CotsCollectionView)
          : result?.collection;
      const desired = collection?.selections.find(
        ({ desiredPoster }) => desiredPoster,
      );
      if (desired)
        setCompletionGate((current) =>
          current ? { ...current, selection: desired } : current,
        );
      window.dispatchEvent(new Event(COTS_IMPORTS_QUEUED_EVENT));
    } catch (cause) {
      setCompletionError(
        cause instanceof Error
          ? cause.message
          : "The image could not be queued again.",
      );
    } finally {
      setCheckingCompletion(false);
    }
  }

  async function openGoalCreator() {
    const response = await persist(draft);
    if (!response.error) {
      setReviewNotice(null);
      setGoalPlacement(primary ? "SUPPORTING" : "PRIMARY");
      setGoalCreatorOpen(true);
    }
  }

  function closeGoalCreator() {
    setGoalCreatorOpen(false);
    window.requestAnimationFrame(() => createGoalButtonRef.current?.focus());
  }

  function addCreatedGoal(goal: OwnedOption, placement: SeasonGoalPlacement) {
    if (placement === "PRIMARY") {
      setPrimary(goal);
      setSupporting((current) =>
        current.filter((option) => option.id !== goal.id),
      );
      setSelectionReset((current) => current + 1);
    } else {
      setSupporting((current) =>
        current.some((option) => option.id === goal.id)
          ? current
          : [...current, goal],
      );
    }
    setReviewNotice(
      `${goal.name} was created and added as ${placement === "PRIMARY" ? "your main direction" : "a supporting goal"}.`,
    );
    closeGoalCreator();
  }

  function updateStandard(key: string, patch: Partial<SeasonStandard>) {
    patchCharacter({
      standards: draft.character.standards.map((standard) =>
        standard.key === key ? { ...standard, ...patch } : standard,
      ),
    });
  }

  const currentStage = stages[draft.stage - 1] ?? stages[0];
  const controlsDisabled = state === "saving" || autosaveBlocked;
  const allGoalOptions = [
    ...season.goals.map(({ goal }) => toGoalOption(goal)),
    ...goalOptions,
    ...(primary ? [primary] : []),
    ...supporting,
  ].filter(
    (option, index, options) =>
      options.findIndex(({ id }) => id === option.id) === index,
  );
  const savedReviewDraft = reviewedSeason
    ? draftFromSeason(reviewedSeason)
    : null;
  const savedReviewAssignment = reviewedSeason
    ? assignmentsFromSeason(reviewedSeason)
    : null;
  const reviewAreas =
    savedReviewDraft && savedReviewAssignment
      ? changedSeasonAreas(
          draft,
          savedReviewDraft,
          assignmentSnapshot,
          savedReviewAssignment,
        )
      : [];
  const localReviewFields = reviewFields(draft, assignmentSnapshot);
  const savedReviewFields =
    savedReviewDraft && savedReviewAssignment
      ? reviewFields(savedReviewDraft, savedReviewAssignment)
      : [];
  const changedReviewLabels = new Set(
    localReviewFields
      .filter(
        ([label, value]) =>
          savedReviewFields.find(
            ([savedLabel]) => savedLabel === label,
          )?.[1] !== value,
      )
      .map(([label]) => label),
  );

  return (
    <main
      className="season-opening-ritual"
      data-arrival={arrival || undefined}
      data-prelude={preludeActive || undefined}
      data-goal-creator={goalCreatorOpen || undefined}
      data-stage={draft.stage}
      data-testid="season-opening-ritual"
    >
      <div className="season-opening-ambient" aria-hidden="true">
        <span className="season-opening-ambient-glow" />
        <span className="season-opening-ambient-grid">
          <span className="season-opening-ambient-wall" />
          <span className="season-opening-ambient-floor" />
        </span>
      </div>

      <div className="season-opening-exit" hidden={cardPlacementOpen}>
        {arrival ? (
          <button
            type="button"
            disabled={deferringArrival}
            onClick={() => void deferAutomaticOpening()}
          >
            {deferringArrival ? "Saving…" : "Not now"}
          </button>
        ) : (
          <Link href="/direction">Leave for now</Link>
        )}
      </div>

      {arrivalError && (
        <p className="season-opening-arrival-error" role="alert">
          {arrivalError}
        </p>
      )}

      {preludeActive && (
        <SeasonOpeningPrelude
          seasonLabel={season.calendar.label}
          onContinue={completePrelude}
        />
      )}

      <div className="season-opening" hidden={preludeActive}>
        <header className="season-opening-header">
          <div>
            <p className="eyebrow">{season.calendar.label} · Opening ritual</p>
            <h1 ref={ritualTitleRef} tabIndex={-1}>
              {currentStage.label}
            </h1>
            <p>{currentStage.description}</p>
          </div>
          <div
            className="season-save-state"
            data-state={reviewPending ? "saving" : state}
            aria-live="polite"
          >
            {reviewPending && "Checking saved season…"}
            {!reviewPending &&
              state === "idle" &&
              season.version === 0 &&
              "Ready when you are"}
            {!reviewPending && state === "saving" && "Saving…"}
            {!reviewPending && state === "saved" && (
              <>
                <Check aria-hidden="true" /> Saved
              </>
            )}
            {!reviewPending && state === "error" && "Couldn’t save"}
            {!reviewPending && state === "conflict" && "Changed elsewhere"}
          </div>
        </header>

        <p className="season-opening-mobile-progress" aria-live="polite">
          Step {draft.stage} of {stages.length} · {currentStage.label}
        </p>
        <ol className="season-opening-progress" aria-label="Opening progress">
          {stages.map((stage) => (
            <li
              key={stage.number}
              data-current={draft.stage === stage.number || undefined}
              data-complete={draft.stage > stage.number || undefined}
            >
              <button
                type="button"
                aria-label={`${stage.number} ${stage.label}`}
                aria-current={draft.stage === stage.number ? "step" : undefined}
                disabled={
                  controlsDisabled || goalCreatorOpen || cardPlacementOpen
                }
                onClick={() => void moveTo(stage.number)}
              >
                <span aria-hidden="true">
                  {String(stage.number).padStart(2, "0")}
                </span>
                <span
                  className="season-opening-progress-label"
                  aria-hidden="true"
                >
                  {stage.label}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <form
          ref={formRef}
          hidden={goalCreatorOpen}
          onSubmit={(event) => event.preventDefault()}
          aria-busy={reviewPending || state === "saving"}
          inert={reviewPending || goalCreatorOpen}
        >
          <input
            type="hidden"
            name="seasonOpeningState"
            value={JSON.stringify({
              draft,
              assignments: assignmentSnapshot.fingerprint,
            })}
          />
          <section className="season-opening-stage" hidden={draft.stage !== 1}>
            <div className="season-opening-question">
              <p className="eyebrow">At the threshold</p>
              <h2 tabIndex={-1}>What crosses into this season?</h2>
              <p>
                Carry only what deserves a place. Leave room for what can become
                different.
              </p>
            </div>
            {season.previous && (
              <aside className="season-previous">
                <p className="eyebrow">Previously</p>
                <Link href={season.previous.href}>{season.previous.title}</Link>
                {season.previous.closingNote && (
                  <p>{season.previous.closingNote}</p>
                )}
              </aside>
            )}
            <div className="season-opening-fields season-opening-fields--two">
              <label>
                <span className="field-label">Carry forward</span>
                <textarea
                  className="text-input"
                  value={draft.answers.carryForward}
                  onChange={(event) =>
                    patchAnswers({ carryForward: event.target.value })
                  }
                  placeholder="A lesson, practice, relationship, or unfinished direction…"
                />
              </label>
              <label>
                <span className="field-label">Leave behind</span>
                <textarea
                  className="text-input"
                  value={draft.answers.leaveBehind}
                  onChange={(event) =>
                    patchAnswers({ leaveBehind: event.target.value })
                  }
                  placeholder="Something that no longer deserves to steer you…"
                />
              </label>
              <label>
                <span className="field-label">
                  This season would feel meaningful if…
                </span>
                <textarea
                  className="text-input"
                  value={draft.answers.meaningful}
                  onChange={(event) =>
                    patchAnswers({ meaningful: event.target.value })
                  }
                  placeholder="One honest sentence is enough."
                />
              </label>
              <label>
                <span className="field-label">Protect</span>
                <textarea
                  className="text-input"
                  value={draft.answers.protect}
                  onChange={(event) =>
                    patchAnswers({ protect: event.target.value })
                  }
                  placeholder="Sleep, family, health, study, or another non-negotiable…"
                />
              </label>
            </div>
          </section>

          <section className="season-opening-stage" hidden={draft.stage !== 2}>
            <div className="season-opening-question">
              <p className="eyebrow">Direction, without a cage</p>
              <h2 tabIndex={-1}>
                What matters most alongside everything else?
              </h2>
              <p>
                Goals keep their own dates. Their role here only explains how
                they serve this season.
              </p>
            </div>
            <div className="season-opening-fields">
              <ReusableEntityCombobox
                key={`primary-goal-${selectionReset}`}
                label="Main direction"
                entityName="goal"
                idFieldName="primaryGoalId"
                queryFieldName="primaryGoalSearch"
                options={allGoalOptions}
                initialId={primary?.id}
                initialName={primary?.name}
                onSelectedOptionChange={setPrimary}
                searchAction={(query) => searchDirectionOptions("goal", query)}
                placeholder="Search your goals…"
              />
              <SeasonSupportingGoals
                options={goalOptions}
                selectedOptions={supporting}
                onSelectionChange={setSupporting}
                notes={supportNotes}
                onNoteChange={(goalId, value) =>
                  setSupportNotes((current) => ({
                    ...current,
                    [goalId]: value,
                  }))
                }
              />
              <button
                ref={createGoalButtonRef}
                className="season-create-goal"
                type="button"
                disabled={controlsDisabled}
                onClick={() => void openGoalCreator()}
              >
                <Plus aria-hidden="true" /> Create a new goal
              </button>
            </div>
          </section>

          <section className="season-opening-stage" hidden={draft.stage !== 3}>
            <CotsOpeningWorkspace
              season={season}
              character={draft.character}
              controlsDisabled={controlsDisabled}
              goalOptions={allGoalOptions}
              onPatchCharacter={patchCharacter}
              onUpdateStandard={updateStandard}
              onBackStage={() => void moveTo(2)}
              onContinuePreview={() => void moveTo(4)}
              onSaveAndLeave={() => void saveAndLeave()}
            />
          </section>

          <section
            className="season-opening-stage season-opening-stage--reveal"
            hidden={draft.stage !== 4}
          >
            <div className="season-opening-question">
              <p className="eyebrow">The season, assembled</p>
              <h2 tabIndex={-1}>Let the direction feel like yours.</h2>
              <p>
                Give the season its final words. Its character and imagery can
                keep evolving without rewriting how it began.
              </p>
            </div>
            <div className="season-opening-fields season-opening-title-fields">
              <label>
                <span className="field-label">Season title — optional</span>
                <input
                  className="text-input"
                  value={draft.title}
                  onChange={(event) =>
                    patchDraft({ title: event.target.value })
                  }
                  placeholder={`Season ${season.quarter}`}
                />
              </label>
              <label>
                <span className="field-label">
                  Opening intention — optional
                </span>
                <textarea
                  className="text-input"
                  value={draft.intention}
                  onChange={(event) =>
                    patchDraft({ intention: event.target.value })
                  }
                  placeholder="The direction you want to remember on an ordinary Tuesday."
                />
              </label>
            </div>
            {cardPlacementOpen && featuredPoster && cardImagePosition ? (
              <SeasonCardPlacementEditor
                season={{ ...season, ...draft }}
                initialPosition={cardImagePosition}
                saving={cardPlacementSaving}
                error={cardPlacementError}
                onCancel={cancelCardPlacement}
                onSave={(position) => void saveCardPlacement(position)}
              />
            ) : (
              <>
                <div className="season-opening-reveal-poster">
                  <SeasonPoster
                    season={{ ...season, ...draft }}
                    imagePosition={cardImagePosition ?? undefined}
                  />
                </div>
                {season.cotsIdentity && (
                  <>
                    <div className="season-preview-edit-actions">
                      {featuredPoster && cardImagePosition && (
                        <button
                          ref={editCardButtonRef}
                          className="season-preview-edit-card"
                          type="button"
                          aria-label="Edit card image placement"
                          disabled={controlsDisabled}
                          onClick={openCardPlacement}
                        >
                          <Crop aria-hidden="true" /> Edit card
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void returnToCots("images")}
                      >
                        Change artwork
                      </button>
                      <button
                        type="button"
                        onClick={() => void returnToCots("words")}
                      >
                        Change words
                      </button>
                      <button
                        type="button"
                        onClick={() => void returnToCots("finalize")}
                      >
                        Change featured choices
                      </button>
                    </div>
                    {cardPlacementNotice && (
                      <p className="season-card-placement-notice" role="status">
                        {cardPlacementNotice}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {completionGate && (
              <aside className="cots-completion-gate" role="status">
                <div>
                  <p className="eyebrow">
                    {completionGate.selection.status === "FAILED"
                      ? "Artwork needs attention"
                      : "Artwork is still arriving"}
                  </p>
                  <h3>
                    {completionGate.selection.candidate.title} is not ready yet.
                  </h3>
                  <p>
                    Your current preview stays in place. You can wait for this
                    image, choose another, or begin with the preview you see
                    now.
                  </p>
                </div>
                <div>
                  {completionGate.selection.status === "FAILED" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={checkingCompletion}
                      onClick={() => void retryCompletionPoster()}
                    >
                      Try this image again
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={checkingCompletion}
                      onClick={() => void completeOpening()}
                    >
                      Check again
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={checkingCompletion}
                    onClick={() => void returnToCots("images")}
                  >
                    Choose another image
                  </Button>
                  <Button
                    type="button"
                    disabled={checkingCompletion}
                    onClick={() => void completeOpening(true)}
                  >
                    Begin with current preview
                  </Button>
                </div>
              </aside>
            )}
            {completionError && (
              <p className="season-form-error" role="alert">
                {completionError}
              </p>
            )}
          </section>

          {(result.error || Object.keys(fieldErrors).length > 0) && (
            <div
              className="season-form-error season-opening-conflict-banner"
              role="alert"
            >
              <div className="season-form-error-copy">
                <strong>
                  {result.error || "Some entries need attention."}
                </strong>
                {Object.values(fieldErrors).length > 0 && (
                  <ul>
                    {Object.entries(fieldErrors).map(([key, value]) => (
                      <li key={key}>{value}</li>
                    ))}
                  </ul>
                )}
              </div>
              {state === "conflict" && (
                <button
                  type="button"
                  disabled={reviewPending}
                  onClick={() => void reviewCurrentSeason(true)}
                >
                  <RotateCcw aria-hidden="true" />
                  {reviewPending
                    ? "Loading saved version…"
                    : "Review the current saved version"}
                </button>
              )}
            </div>
          )}
          {reviewNotice && (
            <p className="season-review-notice" role="status">
              {reviewNotice}
            </p>
          )}
          {reviewError && (
            <p className="season-review-error" role="alert">
              {reviewError}
            </p>
          )}
          {reviewedSeason && savedReviewDraft && savedReviewAssignment && (
            <section
              className="season-conflict-review"
              aria-labelledby="season-conflict-review-title"
            >
              <header>
                <div>
                  <p className="eyebrow">Compare before saving</p>
                  <h3 id="season-conflict-review-title">
                    Your entries and the saved season differ.
                  </h3>
                </div>
                <p>Changed: {reviewAreas.join(", ") || "season details"}.</p>
              </header>
              <div className="season-conflict-comparison">
                {[
                  {
                    title: "Your entries",
                    rows: localReviewFields.filter(([label]) =>
                      changedReviewLabels.has(label),
                    ),
                  },
                  {
                    title: "Currently saved",
                    rows: savedReviewFields.filter(([label]) =>
                      changedReviewLabels.has(label),
                    ),
                  },
                ].map((column) => (
                  <section key={column.title}>
                    <h4>{column.title}</h4>
                    <dl>
                      {column.rows.map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
              <p>
                Loading the saved season replaces this form. Keeping your
                entries lets you apply them with your next Save or Continue
                action.
              </p>
              <footer>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={loadSavedVersion}
                >
                  Load saved version
                </Button>
                <Button type="button" onClick={keepEntriesAfterReview}>
                  Keep my entries
                </Button>
              </footer>
            </section>
          )}
          {draft.stage !== 3 && !cardPlacementOpen && (
            <footer className="season-opening-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={controlsDisabled}
                onClick={() => void saveAndLeave()}
              >
                <Save aria-hidden="true" /> Save and leave
              </Button>
              <div>
                {draft.stage > 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={controlsDisabled}
                    onClick={() => void moveTo(draft.stage - 1)}
                  >
                    <ArrowLeft aria-hidden="true" /> Back
                  </Button>
                )}
                {draft.stage < 4 && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={controlsDisabled}
                    onClick={() => void moveTo(draft.stage + 1, true)}
                  >
                    I’m not sure yet
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={controlsDisabled || checkingCompletion}
                  onClick={() =>
                    void (draft.stage === 4
                      ? completeOpening()
                      : moveTo(Math.min(4, draft.stage + 1)))
                  }
                >
                  {draft.stage === 4
                    ? checkingCompletion
                      ? "Checking artwork…"
                      : "Begin this season"
                    : "Continue"}
                  {draft.stage < 4 && <ArrowRight aria-hidden="true" />}
                </Button>
              </div>
            </footer>
          )}
        </form>

        {goalCreatorOpen && (
          <SeasonGoalCreator
            domainOptions={domainOptions}
            defaultStartOn={defaultGoalStartOn}
            placement={goalPlacement}
            onPlacementChange={setGoalPlacement}
            onCancel={closeGoalCreator}
            onCreated={addCreatedGoal}
          />
        )}
      </div>
    </main>
  );
}
