"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createRequestDeadline } from "@/lib/http/utils/request-deadline.util";
import { Button } from "@/components/ui/buttons/button.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { VersionDrawer } from "@/components/ui/recognized-character/version-drawer.component";
import { useCotsCollection } from "@/features/seasons/discovery/hooks/use-cots-collection.hook";
import type { CharacterLookupResult } from "@/features/seasons/discovery/schemas/character-lookup.schema";
import type { SeasonOnboardingView as SavedOnboarding } from "../onboarding.service";
import type { AvatarPlacement } from "@/components/ui/character-avatar/character-avatar-editor.component";
import { OnboardingImageryPreparation } from "../../imagery/components/onboarding-imagery-preparation.component";
import { onboardingProgress } from "../onboarding-progress.util";
import { seasonActivationRecap } from "../utils/season-activation-recap.util";
import { rememberOpeningPause } from "@/features/seasons/opening/utils/opening-recovery.util";
import {
  SeasonOnboardingView,
  type GuidedActions,
  type GuidedModel,
  type GuidedStage,
} from "./season-onboarding-view.component";

function guidedModel(
  view: SavedOnboarding,
  override: GuidedStage | null,
  busy: boolean,
  error: string,
  lookup: CharacterLookupResult | null,
  candidateId: string,
  workId: number,
): GuidedModel {
  const { pack, run } = view;
  const candidate = lookup?.candidates.find((c) => c.id === candidateId);
  const work = candidate?.works.find((w) => w.id === workId);
  const stage = override ?? run?.stage ?? (pack.identity ? "WORLD" : "ENTRY");
  return {
    stage,
    status:
      override === "WORLD" || override === "ENTRY"
        ? "WAITING"
        : (run?.status ?? "WAITING"),
    chapter: run?.chapter ?? 1,
    progress: onboardingProgress(run?.stage ?? stage, run?.chapter ?? 1),
    reviewOnly: Boolean(
      override &&
      override !== run?.stage &&
      ["SUMMARY", "BANNER", "PORTRAIT", "SCENES"].includes(override),
    ),
    busy,
    error:
      error ||
      run?.error ||
      (!run?.identityCurrent && run
        ? "The character changed. Continue from World & mood to prepare the updated Season."
        : null),
    question: run?.question,
    name: candidate?.name ?? pack.identity?.displayName ?? "",
    work: work?.title ?? pack.identity?.sourceWork ?? "",
    setting: pack.setting,
    visualDirection: pack.visualBrief,
    match: candidate
      ? {
          name: candidate.name,
          sourceWork: work?.title ?? "Choose the source work",
          adaptation: work
            ? [work.adaptation, work.year].filter(Boolean).join(" · ")
            : "Choose the adaptation",
          images: candidate.images,
        }
      : pack.identity
        ? {
            name: pack.identity.displayName,
            sourceWork: pack.identity.sourceWork,
            adaptation: pack.identity.adaptation,
            images: pack.sourceImages.slice(0, 1).map((i) => ({
              href: i.href,
              alt: i.label,
              sourceUrl: i.sourceUrl ?? "",
              sourceLabel: "Saved original",
            })),
          }
        : null,
    summary: run?.draft?.summary,
    preparationProgress: run?.preparationProgress,
    profile: run?.draft?.profile ?? pack.profile,
    originals: pack.sourceImages.slice(0, 2).map((i) => ({
      id: i.id,
      href: i.href,
      label: i.label,
      sourceUrl: i.sourceUrl,
    })),
    banner: pack.banner
      ? {
          name: pack.identity?.displayName ?? "",
          sourceWork: pack.identity?.sourceWork ?? "",
          adaptation: pack.identity?.adaptation,
          desktopSrc: pack.banner.desktopHref,
          phoneSrc: pack.banner.phoneHref,
          avatarSrc: pack.banner.avatarHref,
          quote: pack.banner.quote,
          attribution: pack.banner.attribution,
          rightLine: pack.banner.rightLine,
          crop: pack.banner.crop,
        }
      : undefined,
    scenes: pack.slots
      .filter((s) => s.chapter === run?.chapter && s.latestId && s.previewHref)
      .map((s) => ({
        id: s.latestId!,
        state: s.state,
        format: s.format,
        href: s.previewHref!,
        focalX: s.focalX,
        focalY: s.focalY,
      })),
    pendingImageCount: run?.pendingImageCount,
    budgetReserved: pack.imageReservedEurCents,
  };
}

export function SeasonOnboardingConnected({
  initialView,
  year,
  quarter,
  arrival = false,
  recoveryScope,
  showMotionControls = false,
}: {
  initialView: SavedOnboarding;
  year: number;
  quarter: number;
  arrival?: boolean;
  recoveryScope?: string;
  showMotionControls?: boolean;
}) {
  const router = useRouter();
  const collection = useCotsCollection(year, quarter);
  const [view, setView] = useState(initialView);
  const commandPending = useRef(false);
  const [override, setOverride] = useState<GuidedStage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pollingError, setPollingError] = useState("");
  const [switchOpen, setSwitchOpen] = useState(false);
  const [lookup, setLookup] = useState<CharacterLookupResult | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [workId, setWorkId] = useState(0);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const versionTrigger = useRef<HTMLButtonElement>(null);
  const [choosingCharacter, setChoosingCharacter] = useState(false);
  const savedSelection = useRef<string | null>(null);
  const stage =
    override ?? view.run?.stage ?? (view.pack.identity ? "WORLD" : "ENTRY");
  const endpoint = `/api/direction/seasons/onboarding?year=${year}&quarter=${quarter}`;
  const working =
    view.run?.status === "QUEUED" || view.run?.status === "RUNNING";
  useEffect(() => {
    if (!working) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      const deadline = createRequestDeadline(15_000, controller.signal);
      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: deadline.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (!controller.signal.aborted) {
          setPollingError("");
          setView((previous) =>
            !previous.run || body.run?.revision >= previous.run.revision
              ? body
              : previous,
          );
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setPollingError(
            cause instanceof Error
              ? cause.message
              : "Could not refresh this Season.",
          );
      } finally {
        deadline.dispose();
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 2000);
    }
    timer = setTimeout(refresh, 1000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [endpoint, working]);
  async function refreshView() {
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error ?? "Could not refresh saved artwork.");
    setPollingError("");
    setView(body);
  }
  async function post(action: string, fields: Record<string, unknown> = {}) {
    const response = await fetch("/api/direction/seasons/onboarding", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        year,
        quarter,
        expectedRevision: view.run?.revision ?? 0,
        operationKey: crypto.randomUUID(),
        ...fields,
      }),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error ?? "Could not save this Season.");
    setPollingError("");
    setView(body);
    setOverride(null);
    return body as SavedOnboarding;
  }
  async function attempt(work: () => Promise<unknown>) {
    if (commandPending.current) return false;
    commandPending.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.name === "TimeoutError"
            ? "The server did not respond. Refresh to check saved progress before retrying; your entries are kept."
            : cause.message
          : "Could not continue this Season.",
      );
      return false;
    } finally {
      commandPending.current = false;
      setBusy(false);
    }
  }
  async function prepareSelectedIdentity() {
    const selected = lookup?.candidates.find((c) => c.id === candidateId);
    const edition = selected?.works.find((w) => w.id === workId);
    const key = `${candidateId}:${workId}`;
    const identity = view.pack.identity;
    const alreadySaved =
      selected &&
      edition &&
      identity?.sourceEntityId === selected.id &&
      identity.sourceWork === edition.title &&
      identity.adaptation === edition.adaptation;
    if (selected && !edition)
      throw new Error("Choose a version before continuing.");
    if (selected && !alreadySaved && savedSelection.current !== key) {
      const result = await collection.confirmCharacter({
        candidateId,
        workId,
        association: identity ? "NEW" : undefined,
      });
      if (!result)
        throw new Error(
          "The character could not be saved. Your entries are still here; try again.",
        );
      savedSelection.current = key;
      return post("prepare");
    }
    if (selected && !alreadySaved) return post("prepare");
    return view.run?.identityCurrent ? view : post("prepare");
  }
  async function openVersions() {
    if (lookup?.candidates.some((c) => c.id === candidateId)) {
      setVersionsOpen(true);
      return;
    }
    await attempt(async () => {
      const id = view.pack.identity?.sourceEntityId;
      if (!id)
        throw new Error(
          "This character was entered manually. Use Change character to find a catalogue entry and select its version.",
        );
      const response = await fetch("/api/direction/cots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ action: "CHARACTER_RECORD", candidateId: id }),
      });
      const candidate = await response.json();
      if (!response.ok)
        throw new Error(
          candidate.error ?? "Could not retrieve editions. Try again.",
        );
      setLookup({
        candidates: [candidate],
        suggestedId: id,
        suggestedWorkId: null,
        aiUsed: false,
        notice: null,
      });
      setCandidateId(id);
      setWorkId(
        candidate.works.find(
          (w: { title: string; adaptation: string }) =>
            w.title === view.pack.identity?.sourceWork &&
            w.adaptation === view.pack.identity?.adaptation,
        )?.id ?? 0,
      );
      setVersionsOpen(true);
    });
  }
  async function leaveOpening() {
    if (!arrival || stage === "ACTIVE") {
      router.push("/direction");
      return;
    }
    const scope = recoveryScope ?? `${year}:${quarter}`;
    rememberOpeningPause(
      scope,
      null,
      "Your opening is paused. Your entries are kept for your return.",
    );
    router.replace("/?opening=paused", { scroll: false });
    try {
      const response = await fetch("/api/direction/cots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DEFER_OPENING", year, quarter }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok)
        throw new Error("The saved pause could not be confirmed.");
    } catch {
      rememberOpeningPause(
        scope,
        null,
        "This tab has paused the opening. The saved pause could not be confirmed; your entries remain available when you return.",
      );
    }
  }
  const actions: GuidedActions = {
    lookup: (name, work) =>
      attempt(async () => {
        const response = await fetch("/api/direction/cots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(15_000),
          body: JSON.stringify({
            action: "LOOKUP_CHARACTER",
            name,
            sourceWork: work,
          }),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Character lookup is unavailable.");
        const result = body as CharacterLookupResult;
        const chosen =
          result.candidates.find((c) => c.id === result.suggestedId) ??
          result.candidates[0];
        if (!chosen)
          throw new Error(
            "No catalogue match. Check the character name and source work, or choose another character.",
          );
        setLookup(result);
        setCandidateId(chosen.id);
        setWorkId(
          chosen.works.find((w) => w.id === result.suggestedWorkId)?.id ??
            chosen.works[0]?.id ??
            0,
        );
        const ambiguous = !result.suggestedId && result.candidates.length > 1;
        setChoosingCharacter(ambiguous);
        setOverride(ambiguous ? "ENTRY" : "WORLD");
      }),
    different: () => void openVersions(),
    changeCharacter: () => {
      setError("");
      setChoosingCharacter(false);
      setOverride("ENTRY");
    },
    start: (setting, visualDirection) =>
      attempt(async () => {
        const prepared = await prepareSelectedIdentity();
        await post("start", {
          expectedRevision: prepared.run?.revision ?? 0,
          setting,
          visualDirection,
        });
      }),
    approve: () =>
      attempt(async () => {
        if (
          override &&
          override !== view.run?.stage &&
          ["SUMMARY", "BANNER", "PORTRAIT", "SCENES"].includes(override)
        ) {
          setOverride(null);
          return;
        }
        if (stage === "SUMMARY")
          await post("approve-summary", {
            sourceImageIds: view.pack.sourceImages.slice(0, 2).map((i) => i.id),
            characterLikenessConfirmed: true,
          });
        else if (stage === "BANNER")
          await post("approve-banner", {
            bannerRevision: view.pack.banner?.revision,
            characterLikenessConfirmed: true,
            mobileCharacterVisible: true,
          });
        else if (stage === "PORTRAIT")
          await post("approve-portrait", {
            bannerRevision: view.pack.banner?.revision,
            characterLikenessConfirmed: true,
          });
        else if (stage === "SCENES")
          await post("approve-chapter", {
            artworkIds: view.pack.slots
              .filter((s) => s.chapter === view.run?.chapter)
              .map((s) => s.latestId),
            characterLikenessConfirmed: true,
            mobileCharacterVisible: true,
          });
        else if (stage === "READY") await post("activate");
      }),
    correct: (text) => attempt(() => post("correct", { correction: text })),
    regenerate: (target, artworkId) =>
      attempt(() => {
        const manual =
          target === "scene"
            ? view.pack.creation.method === "MANUAL"
            : target === "avatar"
              ? view.run?.portraitMethod === "MANUAL"
              : view.run?.bannerMethod === "MANUAL";
        return manual
          ? post("open-artwork", {
              target:
                target === "scene"
                  ? "CHAPTER"
                  : target === "avatar"
                    ? "PORTRAIT"
                    : "BANNERS",
            })
          : post("regenerate", { target, ...(artworkId ? { artworkId } : {}) });
      }),
    pause: () => attempt(() => post("pause")),
    resume: () => attempt(() => post("resume")),
    back: () => {
      setError("");
      setVersionsOpen(false);
      if (view.run && ["FAILED", "PAUSED"].includes(view.run.status)) {
        if (stage.startsWith("GENERATING_")) {
          void attempt(() =>
            post("open-artwork", {
              target:
                stage === "GENERATING_BANNER"
                  ? "BANNERS"
                  : stage === "GENERATING_PORTRAIT"
                    ? "PORTRAIT"
                    : "CHAPTER",
            }),
          );
          return;
        }
        if (stage === "ASSEMBLING") {
          setOverride("WORLD");
          return;
        }
      }
      setOverride(
        stage === "WORLD"
          ? "ENTRY"
          : stage === "SUMMARY"
            ? "WORLD"
            : stage === "BANNER"
              ? "SUMMARY"
              : stage === "PORTRAIT"
                ? "BANNER"
                : stage === "SCENES"
                  ? "PORTRAIT"
                  : stage === "READY"
                    ? "SCENES"
                    : null,
      );
    },
    leave: async (fields) => {
      await attempt(async () => {
        if (stage === "WORLD") {
          const prepared = await prepareSelectedIdentity();
          await post("save-world", {
            expectedRevision: prepared.run?.revision ?? 0,
            setting: fields.setting,
            visualDirection: fields.visualDirection,
          });
        }
        await leaveOpening();
      });
    },
    crop: async (placement: AvatarPlacement, file?: File) => {
      setError("");
      try {
        if (file)
          throw new Error(
            "Use Back to upload a replacement portrait, then return to adjust its crop.",
          );
        const response = await fetch("/api/direction/seasons/living", {
          method: "POST",
          signal: AbortSignal.timeout(30000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save-banner-crop",
            year,
            quarter,
            ...placement,
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        await refreshView();
        return true;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not save the crop.",
        );
        return false;
      }
    },
  };
  const preparation =
    view.run &&
    !override &&
    [
      "BANNER_PREPARATION",
      "PORTRAIT_PREPARATION",
      "SCENE_METHOD",
      "SCENE_PREPARATION",
    ].includes(stage) ? (
      <OnboardingImageryPreparation
        embedded
        view={view}
        year={year}
        quarter={quarter}
        busy={busy}
        error={error}
        onCommand={async (action, fields) => {
          await attempt(() => post(action, fields));
        }}
        onRefresh={refreshView}
        onLeave={() => void attempt(leaveOpening)}
        onBack={() =>
          setOverride(
            stage === "BANNER_PREPARATION"
              ? "SUMMARY"
              : stage === "PORTRAIT_PREPARATION"
                ? "BANNER"
                : "PORTRAIT",
          )
        }
      />
    ) : undefined;
  const model = guidedModel(
    view,
    override,
    busy,
    error || pollingError || collection.error || "",
    lookup,
    candidateId,
    workId,
  );
  const candidate = lookup?.candidates.find((c) => c.id === candidateId);
  return (
    <div data-testid="season-opening-ritual" style={{ display: "contents" }}>
      <Dialog
        open={switchOpen}
        onOpenChange={setSwitchOpen}
        className="imagery-method-switch-dialog"
        title={`Switch to ${view.pack.creation.method === "MANUAL" ? "AI" : "manual"} creation?`}
        description={`Your current attempt has ${view.pack.approvedCount} reviewed compositions. Choose what happens to this progress.`}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setSwitchOpen(false);
                void attempt(() =>
                  post("switch-scenes-method", {
                    method:
                      view.pack.creation.method === "MANUAL" ? "AI" : "MANUAL",
                    retention: "KEEP",
                  }),
                );
              }}
            >
              Keep progress until onboarding finishes
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                setSwitchOpen(false);
                void attempt(() =>
                  post("switch-scenes-method", {
                    method:
                      view.pack.creation.method === "MANUAL" ? "AI" : "MANUAL",
                    retention: "DELETE",
                  }),
                );
              }}
            >
              Delete progress now
            </Button>
          </>
        }
      >
        <p>
          Kept images and reviews can be restored when you switch back. The
          selected attempt alone becomes your final scene pack.
        </p>
      </Dialog>
      <SeasonOnboardingView
        showMotionControls={showMotionControls}
        leaveLabel={arrival && stage === "ENTRY" ? "Not now" : undefined}
        season={{ year, quarter }}
        recap={seasonActivationRecap(view, { year, quarter })}
        preparation={preparation}
        imageryControls={
          ["SCENES", "GENERATING_SCENES"].includes(stage) &&
          !override && (
            <div className="guided-candidate-controls imagery-row">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setSwitchOpen(true)}
              >
                Change creation method
              </Button>
              {stage === "SCENES" &&
                (view.pack.creation.method === "MANUAL" ||
                  view.pack.slots.some(
                    (slot) =>
                      slot.chapter === view.run?.chapter && !slot.latestId,
                  )) && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void attempt(() =>
                        post("open-artwork", { target: "CHAPTER" }),
                      )
                    }
                  >
                    {view.pack.creation.method === "MANUAL"
                      ? "Manage uploads"
                      : "Prepare missing scenes"}
                  </Button>
                )}
            </div>
          )
        }
        versionTrigger={versionTrigger}
        characterOptions={
          <>
            {choosingCharacter && stage === "ENTRY" && (
              <div
                className="guided-candidate-controls"
                aria-label="Character matches"
              >
                <p className="type-body-sm">
                  More than one character matches. Choose the one you mean.
                </p>
                {lookup?.candidates.map((c) => (
                  <Button
                    key={c.id}
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setCandidateId(c.id);
                      setWorkId(c.works[0]?.id ?? 0);
                      setChoosingCharacter(false);
                      setOverride("WORLD");
                    }}
                  >
                    {c.name} · {c.works[0]?.title}
                  </Button>
                ))}
              </div>
            )}
            <VersionDrawer
              open={versionsOpen}
              works={
                candidate?.works.map((w) => ({
                  id: w.id,
                  title: w.title,
                  medium: w.adaptation,
                  year: w.year,
                  cover: w.cover,
                })) ?? []
              }
              selected={workId}
              trigger={versionTrigger}
              onClose={() => setVersionsOpen(false)}
              onSelect={(id) => {
                setWorkId(id);
                setVersionsOpen(false);
                setOverride("WORLD");
              }}
            />
          </>
        }
        model={model}
        actions={actions}
        legacyDraftKey={`become-season-onboarding-fields:${initialView.pack.seasonId}:${year}:${quarter}:${initialView.pack.identity?.id ?? "new"}`}
        draftKey={`become-season-onboarding-fields:${view.pack.seasonId}:${year}:${quarter}:draft`}
      />
    </div>
  );
}
