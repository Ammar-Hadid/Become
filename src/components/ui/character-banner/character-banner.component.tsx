"use client";

import { useState } from "react";
import Image from "next/image";
import { Crown } from "lucide-react";
import "./character-banner.css";

export type CharacterBannerContent = {
  name: string;
  sourceWork: string;
  adaptation?: string;
  desktopSrc?: string | null;
  phoneSrc?: string | null;
  alt?: string;
  quote?: string;
  attribution?: string;
  rightLine?: string;
};

export function CharacterBanner({
  content,
  headingLevel = 2,
}: {
  content: CharacterBannerContent;
  headingLevel?: 1 | 2;
}) {
  const [failed, setFailed] = useState(false);
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const hasImage = Boolean(content.desktopSrc && !failed);

  return (
    <section
      className="become-character-banner"
      aria-label="Character identity"
    >
      {hasImage ? (
        <picture className="become-character-banner__art">
          {content.phoneSrc && (
            <source media="(max-width: 40rem)" srcSet={content.phoneSrc} />
          )}
          <Image
            src={content.desktopSrc!}
            alt={content.alt ?? `${content.name} character artwork`}
            fill
            unoptimized
            priority
            sizes="(max-width: 900px) 100vw, 75vw"
            onError={() => setFailed(true)}
          />
        </picture>
      ) : (
        <div
          className="become-character-banner__fallback"
          role="img"
          aria-label="Character banner artwork unavailable"
        />
      )}
      <div className="become-character-banner__copy">
        <span className="become-character-banner__crown type-label">
          <Crown aria-hidden="true" /> Character of the Season
        </span>
        <Heading>{content.name}</Heading>
        <p className="type-body-lg">
          {content.sourceWork}
          {content.adaptation && (
            <>
              {" "}
              <span aria-hidden="true">·</span> {content.adaptation}
            </>
          )}
        </p>
        {content.quote && (
          <blockquote className="become-character-banner__quote">
            <p>“{content.quote}”</p>
            {content.attribution && <cite>— {content.attribution}</cite>}
          </blockquote>
        )}
      </div>
      {content.rightLine && (
        <p className="become-character-banner__line type-overline">
          {content.rightLine}
        </p>
      )}
    </section>
  );
}
