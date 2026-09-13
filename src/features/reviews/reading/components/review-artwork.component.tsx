"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import styles from "../styles/review-reading.module.css";

export function ReviewArtwork({
  src,
  alt,
  fit = "contain",
  position,
  priority = false,
}: {
  src: string | null;
  alt: string;
  fit?: "contain" | "cover";
  position?: string;
  priority?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <div className={styles.artwork} data-fit={fit}>
      {src && failedSource !== src ? (
        // Owned review media needs the browser's authenticated request.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          style={{ objectFit: fit, objectPosition: position }}
          onError={() => setFailedSource(src)}
        />
      ) : (
        <span className={styles.artworkFallback}>
          <ImageOff aria-hidden="true" />
          <span>
            {src ? "Artwork unavailable" : "A season in your own words"}
          </span>
        </span>
      )}
    </div>
  );
}
