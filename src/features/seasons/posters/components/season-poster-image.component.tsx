"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import type {
  SeasonCharacter,
  SeasonMediaView,
} from "@/features/seasons/types/season.types";
function PosterFallback({ character }: { character: SeasonCharacter }) {
  return (
    <div className="season-poster-fallback">
      <span className="season-poster-orbit" aria-hidden="true" />
      <div>
        {character.name ? (
          <>
            <strong>{character.name}</strong>
            <small>{character.sourceWork || "Character selected"}</small>
          </>
        ) : (
          <>
            <ImageOff aria-hidden="true" />
            <strong>Your season, still taking shape</strong>
          </>
        )}
      </div>
    </div>
  );
}

export function SeasonPosterImage({
  poster,
  character,
}: {
  poster?: SeasonMediaView;
  character: SeasonCharacter;
}) {
  const [failedId, setFailedId] = useState<string | null>(null);
  const failed = !poster || failedId === poster.id;
  const effectivePosition = {
    x: poster?.focalX ?? 0.5,
    y: poster?.focalY ?? 0.5,
  };
  if (failed) {
    return <PosterFallback character={character} />;
  }

  return (
    // Authenticated media is served by Become and cannot use the default
    // optimizer because request credentials are not forwarded to loaders.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={poster.href}
      alt={poster.decorative ? "" : poster.alt}
      width={poster.width}
      height={poster.height}
      draggable={false}
      style={{
        objectPosition: `${effectivePosition.x * 100}% ${effectivePosition.y * 100}%`,
      }}
      onError={() => setFailedId(poster.id)}
    />
  );
}
