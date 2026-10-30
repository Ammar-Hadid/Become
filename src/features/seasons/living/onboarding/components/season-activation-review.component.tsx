"use client";

import Image from "next/image";
import type { Ref } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { FeaturedCard } from "@/components/ui/featured-card/featured-card.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import {
  avatarImageStyle,
  type AvatarPlacement,
} from "@/components/ui/character-avatar/character-avatar-editor.component";
import "./season-activation-review.css";

export type SeasonActivationRecap = {
  season: { year: number; quarter: number };
  name: string;
  sourceWork: string;
  adaptation: string;
  portraitSrc?: string | null;
  portraitPlacement: AvatarPlacement;
  personality: string;
  voice: string;
  setting: string;
  visualDirection: string;
  approvedOriginalCount: number;
  approvedBannerCount: number;
  approvedPortraitCount: number;
  approvedSceneCount: number;
  chapterCount: number;
  paceStateCount: number;
};

/** Feature-owned final review. Counts and approved excerpts are supplied by the caller. */
export function SeasonActivationReview({
  recap,
  status,
  error,
  onActivate,
  paused = false,
  titleRef,
  preview = false,
}: {
  recap: SeasonActivationRecap;
  status: "ready" | "activating" | "failed";
  error?: string | null;
  onActivate: () => void;
  paused?: boolean;
  titleRef?: Ref<HTMLHeadingElement>;
  preview?: boolean;
}) {
  const busy = status === "activating";
  return (
    <main className="activation-review" aria-labelledby="activation-title">
      <section
        className="activation-introduction"
        aria-labelledby="activation-title"
      >
        <p className="type-overline">
          Season {recap.season.quarter} · {recap.season.year}
        </p>
        <h1
          ref={titleRef}
          tabIndex={-1}
          id="activation-title"
          className="type-season-entry-title"
        >
          <span>
            Your <em>Season</em>
          </span>{" "}
          <span>is ready.</span>
        </h1>
        <p className="activation-description type-body-lg">
          Bring {recap.name} and the world you shaped into this Season.
          Activation makes your reviewed character and imagery part of Become.
        </p>
      </section>

      <FeaturedCard
        as="section"
        facing="left"
        paused={paused}
        spacing="action"
        className="activation-recap"
        aria-labelledby="activation-recap-title"
      >
        <h2 id="activation-recap-title" className="type-section-title">
          What you’re bringing into this Season
        </h2>
        <div className="activation-identity">
          {recap.portraitSrc && (
            <div className="activation-portrait">
              <Image
                src={recap.portraitSrc}
                alt={`${recap.name} · reviewed profile portrait`}
                fill
                unoptimized
                sizes="80px"
                style={avatarImageStyle(recap.portraitPlacement)}
              />
            </div>
          )}
          <div className="activation-identity-copy">
            <p className="type-widget-title">{recap.name}</p>
            <p className="type-body-sm">
              {[recap.sourceWork, recap.adaptation].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <dl className="activation-recap-list">
          <div>
            <dt className="type-body">
              <Check aria-hidden="true" />
              Character &amp; voice
            </dt>
            <dd className="type-body-sm">
              {recap.personality} {recap.voice}
            </dd>
            <dd className="type-caption">
              Source profile and {recap.approvedOriginalCount} original{" "}
              {recap.approvedOriginalCount === 1 ? "reference" : "references"}{" "}
              reviewed.
            </dd>
          </div>
          <div>
            <dt className="type-body">
              <Check aria-hidden="true" />
              World &amp; mood
            </dt>
            <dd className="type-body-sm">{recap.setting}</dd>
            <dd className="type-body-sm">{recap.visualDirection}</dd>
          </div>
          <div>
            <dt className="type-body">
              <Check aria-hidden="true" />
              Banners &amp; portrait
            </dt>
            <dd className="type-body-sm">
              {recap.approvedBannerCount} banners · desktop and phone
            </dd>
            <dd className="type-body-sm">
              {recap.approvedPortraitCount} reviewed profile portrait
            </dd>
          </div>
          <div>
            <dt className="type-body">
              <Check aria-hidden="true" />
              Evolving scenes
            </dt>
            <dd className="type-body-sm">
              {recap.chapterCount} chapters · {recap.paceStateCount} pace states
            </dd>
            <dd className="type-body-sm">
              {recap.approvedSceneCount} reviewed compositions · desktop and
              phone
            </dd>
          </div>
        </dl>
      </FeaturedCard>

      <div className="activation-action" aria-busy={busy}>
        <Button size="lg" disabled={busy} onClick={onActivate}>
          {busy ? "Activating Season…" : "Activate Season"}
          <ArrowRight aria-hidden="true" />
        </Button>
        {busy && (
          <LoadingIndicator
            variant="orbit-arc"
            area="direction"
            label={
              preview
                ? "Activating Season in this preview"
                : "Activating your Season"
            }
          />
        )}
        {status === "failed" && (
          <p className="activation-error type-body-sm" role="alert">
            {error ??
              "Activation failed. Your reviewed Season is still here. Try again."}
          </p>
        )}
        {!busy && (
          <p className="type-caption">
            Your approved Season begins with this step.
          </p>
        )}
      </div>
    </main>
  );
}
