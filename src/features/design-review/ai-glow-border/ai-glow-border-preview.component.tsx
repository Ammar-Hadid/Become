"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { AiGeneratedText } from "@/components/ui/ai-generated-text/ai-generated-text.component";
import { AiTextFrame } from "@/components/ui/ai-text-frame/ai-text-frame.component";
import "./ai-glow-border-preview.css";

const paragraphs = [
  "Levi brings a quiet, exacting presence to this Season. His reserved manner suggests someone who notices the details and takes responsibility seriously. Care should come through practical action rather than long speeches or constant reassurance. These are illustrative character notes for this preview; connected onboarding will research and cite the chosen adaptation.",
  "His voice will use short, direct sentences and concrete observations. Praise stays specific: what you did, what improved, and what deserves to continue. Dry humor can appear occasionally, without turning every response into a performance. Signature phrases will only be included when their wording can be verified. This example deliberately includes no attributed quotation.",
  "Canon references should appear naturally and sparingly. Responsibility, loyalty and choices made under uncertainty are useful themes; a response should connect those themes to the situation you actually recorded. It should never invent achievements or treat missing evidence as success.",
  "When things go well, he will acknowledge the effort. During a setback, he will name the difficulty plainly and suggest one useful next action. Recovery receives recognition for returning to the work. These are proposed character-inspired reactions for your approval, rather than claims that a particular line appeared in the story.",
  "Visually, the Season places him in a quiet mountain city with early morning light. The recognizable hair, eyes, clothing and restrained expression remain consistent. Progress can develop the environment without forcing combat, darkness or exaggerated anger. Desktop and phone artwork will be composed separately, with room for Become’s interface. You will approve the banners, then your profile picture, then each chapter’s six scenes. Nothing becomes active until you choose Activate Season.",
];

export function AiGlowBorderPreview() {
  const [paused, setPaused] = useState(false);
  return (
    <main className="ai-glow-review">
      <header className="ai-glow-review-heading">
        <h1 className="type-page-title">A little light around the thought.</h1>
        <p className="type-body">
          A primary-gold border and soft glow give AI-prepared text its own
          place. The approved Living Ink animation reveals paragraphs in order
          while a highlight moves around the edge.
        </p>
        <div className="ai-glow-review-controls">
          <Button
            variant="secondary"
            aria-pressed={paused}
            aria-controls="ai-glow-summary"
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? (
              <Play aria-hidden="true" />
            ) : (
              <Pause aria-hidden="true" />
            )}
            {paused ? "Resume motion" : "Pause motion"}
          </Button>
          <span className="type-caption">
            Preview only · illustrative text · no AI calls
          </span>
        </div>
      </header>

      <AiTextFrame
        paused={paused}
        id="ai-glow-summary"
        heading="AI-prepared Season summary"
        description="Levi Ackerman · Attack on Titan · TV anime"
      >
        <div className="ai-glow-summary-copy">
          <AiGeneratedText
            text={paragraphs
              .map(
                (paragraph, index) =>
                  `${paragraph}${index === 0 ? " [1]" : ""}`,
              )
              .join("\n\n")}
            paused={paused}
          />
          <p className="type-caption">
            Sources:{" "}
            <a
              href="https://anilist.co/character/45627/Levi/"
              target="_blank"
              rel="noreferrer"
              aria-label="Preview reference: AniList character catalogue"
            >
              [1]
            </a>
          </p>
        </div>
      </AiTextFrame>

      <footer className="ai-glow-review-foot type-caption">
        <p>
          Reduced motion keeps a static gold border. Animation pauses offscreen
          and when this tab is hidden.
        </p>
        <p>
          This approved treatment is now shared in Storybook and the Season
          onboarding candidate. The complete onboarding is still under review.
        </p>
      </footer>
    </main>
  );
}
