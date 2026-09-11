"use client";

import { usePathname } from "next/navigation";
import { CotsPendingArtwork } from "@/features/seasons/discovery/components/cots-pending-artwork.component";
import { useCotsPresentation } from "@/features/seasons/presentation/hooks/use-cots-presentation.hook";
import { isCurrentBecomeSeason } from "@/features/seasons/presentation/utils/current-season.util";

export function CotsRouteLoading() {
  const pathname = usePathname();
  const presentation = useCotsPresentation();
  const currentDetail = presentation
    ? `/direction/seasons/${presentation.year}/${presentation.quarter}`
    : "";
  const routeAllowsArtwork =
    pathname === "/direction" || pathname === currentDetail;
  const media =
    presentation &&
    routeAllowsArtwork &&
    isCurrentBecomeSeason(presentation.year, presentation.quarter)
      ? presentation.media
      : null;

  return (
    <div
      className="page-shell direction-shell direction-loading"
      aria-busy="true"
      aria-label="Loading direction"
    >
      <div className="direction-loading-title" />
      <div className="direction-loading-nav" />
      {media ? (
        <CotsPendingArtwork
          media={media}
          active
          variant="route"
          label="Returning to your current chapter…"
          detail="Loading Direction"
        />
      ) : (
        <div className="direction-loading-poster" />
      )}
    </div>
  );
}
