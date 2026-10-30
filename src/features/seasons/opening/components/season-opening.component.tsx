"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { InterfaceSoundProvider } from "@/components/ui/sound/components/interface-sound-provider.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { type ReusableEntityOption } from "@/components/ui/forms/reusable-entity-combobox.component";
import type { OwnedOption } from "@/features/direction/types/direction.types";
import { useSeasonDraftSave } from "@/features/seasons/opening/hooks/use-season-draft-save.hook";
import { cotsCategory } from "@/features/seasons/discovery/constants/cots-category.constants";
import { CotsOpeningWorkspace } from "@/features/seasons/discovery/components/cots-opening-workspace.component";
import type {
  SeasonDraft,
  SeasonView,
} from "@/features/seasons/types/season.types";
import {
  readOpeningPause,
  rememberOpeningPause,
  type OpeningRecovery,
} from "@/features/seasons/opening/utils/opening-recovery.util";
import "@/features/seasons/opening/styles/season-opening-ritual.css";

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
    stage: 3,
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

type SeasonOpeningProps = {
  season: SeasonView;
  arrival?: boolean;
  fromFinale?: boolean;
  recoveryScope?: string;
  showBannerExample?: boolean;
};

export function SeasonOpening(props: SeasonOpeningProps) {
  return (
    <SeasonOpeningSession
      key={`${props.recoveryScope ?? props.season.id ?? "opening"}:${props.season.year}:${props.season.quarter}`}
      {...props}
    />
  );
}

function SeasonOpeningSession({
  season,
  arrival = false,
  fromFinale = false,
  recoveryScope,
  showBannerExample,
}: SeasonOpeningProps) {
  const router = useRouter();
  const arriving = arrival || fromFinale;
  const formRef = useRef<HTMLFormElement>(null);
  const ritualTitleRef = useRef<HTMLHeadingElement>(null);
  const initialDraft = draftFromSeason(season);
  const initialAssignment = assignmentsFromSeason(season);
  const savedOpeningAtMount = useRef({
    draft: initialDraft,
    assignment: initialAssignment,
  });
  const recoveryKey = recoveryScope ?? season.id;
  const queuedDraftFingerprint = useRef(JSON.stringify(initialDraft));
  const latestDraft = useRef<SeasonDraft>(initialDraft);
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
  const [deferringArrival, setDeferringArrival] = useState(false);
  const [arrivalError, setArrivalError] = useState<string | null>(null);
  const [keptOpening, setKeptOpening] = useState<OpeningRecovery | null>(null);
  const loadedSavedVersion = useRef<number | null>(null);
  const {
    acceptReviewedVersion,
    fieldErrors,
    requireReview,
    result,
    saveDraft,
    state,
    version,
  } = useSeasonDraftSave(season);
  const markSaved = useRecordFormGuard(formRef);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const kept = readOpeningPause(recoveryKey).recovery;
      const saved = savedOpeningAtMount.current;
      if (
        kept &&
        writableFingerprint(kept.draft, kept) !==
          writableFingerprint(saved.draft, saved.assignment)
      )
        setKeptOpening(kept);
    });
    return () => cancelAnimationFrame(frame);
  }, [recoveryKey]);

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
      // Edits made while the initial read is in flight are local work, not a
      // conflict, when the server still matches the version we opened.
      const baseline = savedOpeningAtMount.current;
      if (
        !explicit &&
        current.season.version === version.current &&
        writableFingerprint(baseline.draft, baseline.assignment) ===
          writableFingerprint(savedDraft, savedAssignment)
      )
        return;
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
        if (!response.error && latestDraft.current === snapshot) markSaved();
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [autosaveBlocked, draft, markSaved, saveSnapshot]);

  async function persist(next: SeasonDraft, complete = false) {
    setDraft(next);
    const saved = await saveSnapshot(next, complete);
    if (saved.error) return saved;
    markSaved();
    return saved;
  }

  async function finishOpening() {
    const response = await persist(draft, true);
    if (!response.error) {
      router.push(`/direction/seasons/${season.year}/${season.quarter}`);
      router.refresh();
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
    if (deferringArrival) return;
    setDeferringArrival(true);
    setArrivalError(null);
    const recovery = { draft, primary, supporting, supportNotes };
    rememberOpeningPause(
      recoveryKey,
      recovery,
      "Your opening is paused. Any unconfirmed entries are kept in this tab for your manual return.",
    );
    markSaved();
    const saveRequest = persist(draft);
    router.replace("/?opening=paused", { scroll: false });
    try {
      const saved = await saveRequest;
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
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(
          body?.error || "Become could not remember that choice yet.",
        );
      rememberOpeningPause(
        recoveryKey,
        saved.error ? recovery : null,
        saved.error
          ? "The opening is paused. Some entries could not be confirmed; they are kept in this tab for you to review when you return."
          : "Your opening is paused. Return through its Home entry when you choose.",
      );
    } catch (cause) {
      rememberOpeningPause(
        recoveryKey,
        recovery,
        `You are back in Become. This tab will keep the opening paused, and your entries are kept here. The saved deferral could not be confirmed: ${cause instanceof Error ? cause.message : "Please retry when you return."}`,
      );
    }
  }

  const controlsDisabled = state === "saving" || autosaveBlocked;
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
      data-arrival={arriving || undefined}
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

      <div className="season-opening-exit">
        {arriving ? (
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

      <div className="season-opening">
        <header className="season-opening-header">
          <div>
            <p className="eyebrow">{season.calendar.label} · A new beginning</p>
            <h1 ref={ritualTitleRef} tabIndex={-1}>
              Create your Season
            </h1>
            <p>Choose a standard to return to when intention is tested.</p>
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
        {keptOpening && (
          <aside className="season-opening-kept-entries">
            <p>
              Entries from your earlier opening are kept in this tab. Review
              them against the saved Season before applying them.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDraft({ ...keptOpening.draft, stage: 3 });
                latestDraft.current = { ...keptOpening.draft, stage: 3 };
                setPrimary(keptOpening.primary);
                setSupporting(keptOpening.supporting);
                setSupportNotes(keptOpening.supportNotes);
                latestAssignment.current = {
                  primary: keptOpening.primary,
                  supporting: keptOpening.supporting,
                  supportNotes: keptOpening.supportNotes,
                  fingerprint: assignmentFingerprint(
                    keptOpening.primary,
                    keptOpening.supporting,
                    keptOpening.supportNotes,
                  ),
                };
                setKeptOpening(null);
                requireReview(
                  "Your kept entries are ready for comparison with the saved Season.",
                );
                void reviewCurrentSeason(true);
              }}
            >
              Review kept entries
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setKeptOpening(null);
                rememberOpeningPause(
                  recoveryKey,
                  null,
                  "Your opening remains paused until you choose to return.",
                );
              }}
            >
              Discard kept copy
            </Button>
          </aside>
        )}

        <form
          ref={formRef}
          onSubmit={(event) => event.preventDefault()}
          aria-busy={reviewPending || state === "saving"}
          inert={reviewPending}
        >
          <input
            type="hidden"
            name="seasonOpeningState"
            value={JSON.stringify({
              draft,
              assignments: assignmentSnapshot.fingerprint,
            })}
          />
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
        </form>

        <section className="season-opening-stage">
          <InterfaceSoundProvider>
            <CotsOpeningWorkspace
              season={season}
              character={draft.character}
              controlsDisabled={controlsDisabled}
              onSaveDraft={async () => !(await persist(draft)).error}
              onPatchCharacter={patchCharacter}
              onFinish={() => void finishOpening()}
              onSaveAndLeave={() => void saveAndLeave()}
              showBannerExample={showBannerExample}
            />
          </InterfaceSoundProvider>
        </section>
      </div>
    </main>
  );
}
