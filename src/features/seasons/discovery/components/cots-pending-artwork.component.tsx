"use client";

import { LoaderCircle } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { SeasonMediaView } from "@/features/seasons/types/season.types";
import { cn } from "@/lib/styles/utils/class-name.util";

type PendingArtworkMedia = SeasonMediaView & {
  previewHref?: string | null;
  hasAlpha?: boolean;
};

export function CotsPendingArtwork({
  media,
  active,
  label,
  detail,
  variant = "inline",
}: {
  media?: PendingArtworkMedia;
  active: boolean;
  label: string;
  detail?: string;
  variant?: "inline" | "route";
}) {
  const [failedId, setFailedId] = useState<string | null>(null);
  const previewHref = media?.previewHref;
  const showVisual = Boolean(
    active && media && previewHref && failedId !== media.id,
  );
  const maskStyle =
    media?.hasAlpha && previewHref
      ? ({ "--cots-alpha-mask": `url("${previewHref}")` } as CSSProperties)
      : undefined;

  return (
    <div
      className={cn(
        "cots-pending-artwork",
        `cots-pending-artwork--${variant}`,
        active && "is-active",
      )}
      role="status"
      aria-live="polite"
    >
      {showVisual && media && previewHref ? (
        <span
          className="cots-pending-artwork-visual"
          data-alpha={media.hasAlpha || undefined}
          style={maskStyle}
          aria-hidden="true"
        >
          {/* Authenticated local media cannot use the default image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewHref}
            alt=""
            width={media.width}
            height={media.height}
            style={{
              objectPosition: `${media.focalX * 100}% ${media.focalY * 100}%`,
            }}
            onError={() => setFailedId(media.id)}
          />
          <span />
        </span>
      ) : active ? (
        <LoaderCircle
          className="cots-pending-status-icon direction-spin"
          aria-hidden="true"
        />
      ) : null}
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
    </div>
  );
}
