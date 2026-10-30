"use client";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import "./recognized-character.css";
export type RecognitionImage = {
  href: string;
  sourceUrl: string;
  alt?: string;
};

const PICTURE_TIMEOUT_MS = 8_000;

function IdentityPicture({
  reference,
  name,
}: {
  reference: RecognitionImage;
  name: string;
}) {
  const [picture, setPicture] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    const controller = new AbortController();
    const image = new window.Image();
    const timer = setTimeout(() => {
      active = false;
      controller.abort();
      image.removeAttribute("src");
      setFailed(true);
    }, PICTURE_TIMEOUT_MS);
    void (async () => {
      try {
        // Same-origin images can be cancelled and retried without a stale native
        // image request being reused. External catalogue pictures need no CORS.
        let href = reference.href;
        if (href.startsWith("/")) {
          const response = await fetch(href, { signal: controller.signal });
          if (!response.ok) throw new Error("Picture unavailable");
          const blob = await response.blob();
          if (!active) return;
          objectUrl = URL.createObjectURL(blob);
          href = objectUrl;
        }
        if (!active) return;
        image.src = href;
        await image.decode();
        if (active) setPicture(href);
      } catch {
        if (active) setFailed(true);
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
      image.removeAttribute("src");
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reference.href, attempt]);
  return picture ? (
    <a
      className="recognized-character-picture"
      href={reference.sourceUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`View original image source for ${name}`}
    >
      <Image
        src={picture}
        alt={reference.alt ?? `${name} · catalogue image`}
        fill
        unoptimized
        sizes="112px"
      />
    </a>
  ) : (
    <div className="recognized-character-picture" role="status">
      {failed ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFailed(false);
            setAttempt((value) => value + 1);
          }}
        >
          Retry picture
        </Button>
      ) : (
        <span className="type-caption">Loading picture…</span>
      )}
    </div>
  );
}

/** Approved quiet identity recognition; source-image approval stays feature-owned. */
export function RecognizedCharacter({
  name,
  sourceWork,
  adaptation,
  reference,
  actions,
}: {
  name: string;
  sourceWork: string;
  adaptation: string;
  reference?: RecognitionImage;
  actions: ReactNode;
}) {
  return (
    <section className="recognized-character" aria-label="Recognized character">
      {reference ? (
        <IdentityPicture
          key={reference.href}
          name={name}
          reference={reference}
        />
      ) : (
        <div
          className="recognized-character-picture"
          role="img"
          aria-label="No picture for this edition"
        >
          <UserRound aria-hidden="true" />
        </div>
      )}
      <div className="recognized-character-copy">
        <h2 className="type-widget-title">{name}</h2>
        <p className="type-body-sm">{sourceWork}</p>
        <p className="type-caption">{adaptation}</p>
      </div>
      <div className="recognized-character-actions">{actions}</div>
    </section>
  );
}
