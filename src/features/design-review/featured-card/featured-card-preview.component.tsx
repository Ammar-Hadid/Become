"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { Button } from "@/components/ui/buttons/button.component";
import { FeaturedCard } from "@/components/ui/featured-card/featured-card.component";
import "./featured-card-preview.css";
import { FeaturedCardContent } from "./featured-card-content.component";

export function FeaturedCardPreview() {
  const [paused, setPaused] = useState(false);
  const [facing, setFacing] = useState<"left" | "right">("left");
  const [example, setExample] = useState<"recap" | "summary">("recap");
  return (
    <div className="featured-card-review">
      <header className="featured-card-review__header">
        <BrandMark />
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          {paused ? "Resume motion" : "Pause motion"}
        </Button>
      </header>
      <main className="featured-card-review__main">
        <header className="featured-card-review__introduction">
          <div>
            <h1 className="type-page-title">Featured card</h1>
            <p className="type-body">
              A glass face, a gold-lit edge, a little room to float.
            </p>
          </div>
          <div
            className="featured-card-review__examples"
            role="group"
            aria-label="Card example"
          >
            <Button
              size="sm"
              variant={example === "recap" ? "primary" : "secondary"}
              aria-pressed={example === "recap"}
              onClick={() => setExample("recap")}
            >
              Season recap
            </Button>
            <Button
              size="sm"
              variant={example === "summary" ? "primary" : "secondary"}
              aria-pressed={example === "summary"}
              onClick={() => setExample("summary")}
            >
              AI summary
            </Button>
          </div>
        </header>
        <div
          className="featured-card-review__examples featured-card-review__facing"
          role="group"
          aria-label="Card facing"
        >
          <Button
            size="sm"
            variant={facing === "left" ? "primary" : "secondary"}
            aria-pressed={facing === "left"}
            onClick={() => setFacing("left")}
          >
            <ArrowLeft aria-hidden="true" />
            Facing left
          </Button>
          <Button
            size="sm"
            variant={facing === "right" ? "primary" : "secondary"}
            aria-pressed={facing === "right"}
            onClick={() => setFacing("right")}
          >
            Facing right
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <div className="featured-card-review__stage">
          <FeaturedCard
            paused={paused}
            facing={facing}
            spacing="action"
            as="article"
          >
            <FeaturedCardContent example={example} />
          </FeaturedCard>
        </div>
        <p className="featured-card-review__note type-caption">
          Component preview · illustrative content · no AI calls or Season
          changes
        </p>
      </main>
    </div>
  );
}
