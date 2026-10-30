"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badges/badge.component";
import { Card } from "@/components/ui/cards/card.component";
import { ResizableViewport } from "@/components/ui/viewport-preview/components/resizable-viewport.component";
import {
  PHONE_ARTWORK_VIEWPORT,
  type ViewportSize,
} from "@/components/ui/viewport-preview/config/resizable-viewport.config";
import "./phone-resize-review.css";

export function PhoneResizeReview() {
  const [size, setSize] = useState<ViewportSize>(
    PHONE_ARTWORK_VIEWPORT.initialSize,
  );

  return (
    <main className="phone-resize-review">
      <header className="phone-resize-review-header">
        <Link
          href="/design-review"
          className="phone-resize-review-back type-label"
        >
          <ArrowLeft aria-hidden="true" /> Shared system review
        </Link>
        <span className="type-overline">INTERACTION STUDY / 01</span>
        <h1 className="type-page-title">Shape the phone viewport</h1>
        <p className="type-body">
          Press and drag the glowing frame edges. The right edge changes width,
          the bottom edge changes height, and the corner changes both.
        </p>
      </header>

      <Card
        as="section"
        material="elevated-glass"
        spacing="overview"
        className="phone-resize-review-card"
        aria-label="Resizable phone artwork preview"
      >
        <div className="phone-resize-review-card-top">
          <div>
            <span className="type-overline">02 / NARROW COMPOSITION</span>
            <h2 className="type-section-title">Phone composition</h2>
          </div>
          <Badge variant="specimen-strip" area="direction">
            Shared component
          </Badge>
        </div>

        <ResizableViewport size={size} onSizeChange={setSize}>
          <Image
            src="/design-review/phone-resize-candidate.png"
            alt="Levi Ackerman in a rooftop workshop, used to inspect phone cropping"
            fill
            unoptimized
            sizes="430px"
          />
          <div className="phone-resize-review-art-copy type-label">
            <span>Talk to your C.O.T.S</span>
            <strong>ASK ME ANYTHING</strong>
          </div>
        </ResizableViewport>
      </Card>

      <p className="phone-resize-review-note type-body-sm">
        This approved resize interaction is shared with the Season artwork
        review. Its dimensions and keyboard steps are in the shared config;
        colors, sizing, spacing and glow are in tokens.css.
      </p>
    </main>
  );
}
