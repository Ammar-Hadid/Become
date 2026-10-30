"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pause, Play, Save } from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { Button } from "@/components/ui/buttons/button.component";
import { livingArtworkSlots } from "@/features/seasons/living/utils/living-artwork-prompt.util";
import { createOnboardingPreviewModel } from "../season-onboarding/season-onboarding-candidate.component";
import { SeasonRitualLayout } from "@/components/layout/season-ritual/season-ritual-layout.component";
import { StepIndicator } from "@/components/ui/step-indicator/step-indicator.component";
import { resolveOpeningProgress } from "@/features/seasons/living/onboarding/utils/season-opening-progress.util";
import {
  SeasonActivationReview,
  type SeasonActivationRecap,
} from "@/features/seasons/living/onboarding/components/season-activation-review.component";
import "../season-opening-layout/season-opening-layout-preview.css";

function sampleRecap(
  season: SeasonActivationRecap["season"],
): SeasonActivationRecap {
  const sample = createOnboardingPreviewModel("READY");
  return {
    season,
    name: sample.name,
    sourceWork: sample.work,
    adaptation: sample.banner?.adaptation ?? "",
    portraitSrc: sample.banner?.avatarSrc,
    portraitPlacement: sample.banner?.crop ?? { x: 0.5, y: 0.5, zoom: 1.24 },
    personality: sample.profile?.personality?.description ?? "",
    voice: sample.profile?.speechPatterns[0]?.description ?? "",
    setting: sample.setting,
    visualDirection: sample.visualDirection,
    approvedOriginalCount: sample.originals.length,
    approvedBannerCount: 2,
    approvedPortraitCount: 1,
    approvedSceneCount: livingArtworkSlots.length,
    chapterCount: new Set(livingArtworkSlots.map((slot) => slot.chapter)).size,
    paceStateCount: new Set(livingArtworkSlots.map((slot) => slot.state)).size,
  };
}

/** Independent visual candidate; every approval/count and activation is a labeled sample. */
export function SeasonActivationCandidate({
  season,
}: {
  season: SeasonActivationRecap["season"];
}) {
  const router = useRouter();
  const defaults = sampleRecap(season);
  const [recap, setRecap] = useState(defaults);
  const [status, setStatus] = useState<"ready" | "activating" | "failed">(
    "ready",
  );
  const [complete, setComplete] = useState(false);
  const [paused, setPaused] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [failNext, setFailNext] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTitle = useRef<HTMLHeadingElement>(null);
  const storageKey = `become-activation-preview-v1:${season.year}:${season.quarter}`;
  const returnHref = `/season-opening-layout-candidate?year=${season.year}&quarter=${season.quarter}`;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const own = localStorage.getItem(storageKey);
        const raw: unknown = JSON.parse(
          own ??
            localStorage.getItem(
              `become-opening-layout-preview-v1:${season.year}:${season.quarter}`,
            ) ??
            "null",
        );
        if (!raw || typeof raw !== "object") return;
        const value = raw as Record<string, unknown>;
        const base = sampleRecap(season);
        const name =
          typeof value.name === "string" && value.name.trim()
            ? value.name
            : base.name;
        const sourceWork =
          typeof value.work === "string" ? value.work : base.sourceWork;
        const matchingSample =
          name === base.name && sourceWork === base.sourceWork;
        setRecap({
          ...base,
          name,
          sourceWork,
          adaptation:
            typeof value.adaptation === "string"
              ? value.adaptation
              : base.adaptation,
          setting:
            typeof value.setting === "string" && value.setting.trim()
              ? value.setting
              : base.setting,
          visualDirection:
            typeof value.visualDirection === "string" &&
            value.visualDirection.trim()
              ? value.visualDirection
              : base.visualDirection,
          portraitSrc: matchingSample ? base.portraitSrc : null,
          personality: matchingSample
            ? base.personality
            : "Your reviewed personality and character profile.",
          voice: matchingSample
            ? base.voice
            : "Speech patterns, phrases, canon and reactions are included in the reviewed profile.",
        });
        setSaved(Boolean(own));
      } catch {
        setSaveError(
          "Could not restore the local preview. The sample is still available.",
        );
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [season, storageKey]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (complete) successTitle.current?.focus();
  }, [complete]);

  function showState(next: typeof status) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = next === "activating";
    setStatus(next);
    setComplete(false);
  }

  function activate() {
    if (pending.current || complete) return;
    pending.current = true;
    const shouldFail = failNext;
    setFailNext(false);
    setAttempts((count) => count + 1);
    setStatus("activating");
    timer.current = setTimeout(() => {
      pending.current = false;
      timer.current = null;
      if (shouldFail) setStatus("failed");
      else {
        setStatus("ready");
        setComplete(true);
      }
    }, 1200);
  }

  function leave() {
    if (pending.current) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          name: recap.name,
          work: recap.sourceWork,
          adaptation: recap.adaptation,
          setting: recap.setting,
          visualDirection: recap.visualDirection,
        }),
      );
      setSaved(true);
      setSaveError("");
      router.push(returnHref);
    } catch {
      setSaveError(
        "Save failed. Your activation preview is still here. Try again.",
      );
    }
  }

  return (
    <>
      <SeasonRitualLayout
        split={false}
        paused={paused}
        contentKey="activation-candidate"
        introduction={null}
        header={
          <>
            <div className="opening-layout-brand">
              <BrandMark />
              <span className="type-system">A higher version of you</span>
            </div>
            <StepIndicator
              items={
                resolveOpeningProgress(complete ? "ACTIVE" : "READY").phases
              }
              label="Season phases"
              variant="phase"
            />
            <div className="opening-layout-header-actions">
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={paused}
                aria-controls="opening-layout-content"
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
                {paused ? "Resume motion" : "Pause motion"}
              </Button>
              <span
                className="activation-preview-status type-caption"
                role="status"
              >
                {saved ? "Preview saved on this device" : "Sample preview"}
              </span>
            </div>
          </>
        }
        footer={
          <div className="activation-preview-footer">
            <div className="activation-preview-secondary">
              <div className="activation-preview-secondary">
                <Button
                  variant="ghost"
                  disabled={status === "activating"}
                  onClick={() => router.push(returnHref)}
                >
                  <ArrowLeft aria-hidden="true" />
                  Back
                </Button>
                <Button
                  variant="ghost"
                  disabled={status === "activating"}
                  onClick={leave}
                >
                  <Save aria-hidden="true" />
                  Save and leave
                </Button>
              </div>
              <span className="type-caption">
                Artwork reserved · €7.65 / €15
              </span>
            </div>
            {saveError && (
              <p className="activation-error type-body-sm" role="alert">
                {saveError}
              </p>
            )}
            <p className="type-caption">
              Layout preview · sample artwork, approvals and counts · no Season
              changes
            </p>
          </div>
        }
      >
        {complete ? (
          <main className="activation-preview-success">
            <h1 ref={successTitle} tabIndex={-1} className="type-page-title">
              Preview activation complete.
            </h1>
            <p className="type-body">
              This demonstrates the final action. Your actual Season has not
              changed.
            </p>
            <Button
              variant="secondary"
              onClick={() => showState("ready")}
              style={{ justifySelf: "start" }}
            >
              Return to activation review
            </Button>
          </main>
        ) : (
          <SeasonActivationReview
            preview
            recap={recap}
            paused={paused}
            status={status}
            error="Activation failed in this preview. Your reviewed Season is still here. Try again."
            onActivate={activate}
          />
        )}
      </SeasonRitualLayout>
      <details className="activation-preview-controls">
        <summary className="type-caption">Review states · sample only</summary>
        <div className="activation-preview-secondary">
          <Button variant="ghost" size="sm" onClick={() => showState("ready")}>
            Ready
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => showState("activating")}
          >
            Activating
          </Button>
          <Button variant="ghost" size="sm" onClick={() => showState("failed")}>
            Failure
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              showState("ready");
              setFailNext(true);
            }}
          >
            Fail next activation
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRecap({
                ...defaults,
                name: "A very long character name for this layout review",
                sourceWork:
                  "A source work with a longer title for the identity layout",
                adaptation: "An adaptation with a longer descriptive label",
                portraitSrc: null,
                personality:
                  "An illustrative personality excerpt for testing longer review content.",
                voice:
                  "A concise voice summary stays readable without repeating the full research brief.",
                setting:
                  "A quiet coastal city with old observatories, narrow winding streets and a harbor overlooking the mountains",
                visualDirection:
                  "Calm, cinematic morning light, restrained gold accents and recognizable character details across every composition.",
              });
              setSaved(false);
            }}
          >
            Long content
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRecap({
                ...defaults,
                portraitPlacement: { x: 0.4, y: 0.35, zoom: 1.7 },
              });
              setSaved(false);
            }}
          >
            Cropped portrait
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              showState("ready");
              setRecap(defaults);
              setFailNext(false);
              setSaved(false);
            }}
          >
            Reset sample
          </Button>
        </div>
        <p className="type-caption">
          Preview activation attempts: {attempts}
          {failNext ? " · next attempt will fail" : ""}
        </p>
      </details>
    </>
  );
}
