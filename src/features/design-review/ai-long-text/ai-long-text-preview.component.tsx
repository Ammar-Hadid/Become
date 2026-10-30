"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { AiGeneratedText } from "@/components/ui/ai-generated-text/ai-generated-text.component";
import { AiTextFrame } from "@/components/ui/ai-text-frame/ai-text-frame.component";
import { Button } from "@/components/ui/buttons/button.component";
import {
  SelectionLabel,
  Switch,
} from "@/components/ui/forms/selection.component";
import "./ai-long-text-preview.css";

// Illustrative, source-aware preview copy; never a connected model response.
const paragraphs = [
  "Levi brings a quiet, exacting presence to this Season. His reserved manner suggests someone who notices details and takes responsibility seriously. Care should come through practical action rather than long speeches or constant reassurance. These are illustrative character notes; connected onboarding will research and cite the chosen adaptation. [1]",
  "His voice uses short, direct sentences and concrete observations. Praise stays specific: what you did, what improved, and what deserves to continue. Dry humor can appear occasionally, without turning every response into a performance. Signature phrases are included only when their wording can be verified. This example contains no attributed quotation.",
  "Canon references should appear naturally and sparingly. Responsibility, loyalty and choices made under uncertainty are useful themes. A response should connect those themes to the situation you actually recorded. It should never invent achievements or treat missing evidence as success.",
  "When things go well, he acknowledges the effort. During a setback, he names the difficulty plainly and suggests one useful next action. Recovery receives recognition for returning to the work. These are proposed character-inspired reactions for your approval, rather than claims that a particular line appeared in the story.",
  "Visually, the Season places him in a quiet mountain city with early morning light. Recognizable hair, eyes, clothing and restrained expression remain consistent. Progress can develop the environment without forcing combat, darkness or exaggerated anger. Desktop and phone artwork are composed separately, with room for Become’s interface. You review the banners, then your profile picture, then each chapter’s six scenes. Nothing becomes active until you choose Activate Season.",
];

export function AiLongTextPreview() {
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [deviceReducedMotion, setDeviceReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setDeviceReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const staticText = reduceMotion || deviceReducedMotion;

  return (
    <main className="living-ink-review" data-static={staticText}>
      <header className="living-ink-review__intro">
        <h1 className="type-page-title">Living Ink</h1>
        <p className="type-body-lg">
          A trail of gold brings each thought into focus. One paragraph at a
          time.
        </p>
        <div className="living-ink-review__controls">
          <Button
            variant="secondary"
            onClick={() => {
              setPaused(false);
              setRun((current) => current + 1);
            }}
            aria-controls="living-ink-summary"
          >
            <RotateCcw aria-hidden="true" /> Replay reveal
          </Button>
          <Button
            variant="ghost"
            aria-pressed={paused}
            aria-controls="living-ink-summary"
            disabled={staticText}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? (
              <Play aria-hidden="true" />
            ) : (
              <Pause aria-hidden="true" />
            )}
            {paused ? "Resume motion" : "Pause motion"}
          </Button>
          <SelectionLabel>
            <Switch
              checked={reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
            />
            Reduced-motion preview
          </SelectionLabel>
        </div>
        <p className="type-caption">
          Approved Living Ink · illustrative summary · no AI calls
        </p>
      </header>

      <AiTextFrame
        id="living-ink-summary"
        heading="AI-prepared Season summary"
        description="Levi Ackerman · Attack on Titan · TV anime"
        paused={paused || staticText}
      >
        <div className="living-ink-review__copy">
          <AiGeneratedText
            key={run}
            text={paragraphs.join("\n\n")}
            paused={paused}
            staticText={staticText}
          />
          <p className="type-caption">
            Preview reference:{" "}
            <a
              href="https://anilist.co/character/45627/Levi/"
              target="_blank"
              rel="noreferrer"
              aria-label="Source 1: AniList character catalogue"
            >
              [1] Character catalogue
            </a>
          </p>
        </div>
      </AiTextFrame>

      <details className="living-ink-research type-body">
        <summary>Why this reveal?</summary>
        <div>
          <p>
            <a
              href="https://streamdown.ai/docs/animation"
              target="_blank"
              rel="noreferrer"
            >
              Vercel’s Streamdown
            </a>{" "}
            documents word fades and blur-to-sharp arrivals for streamed text.
            This proposal takes its word-level rhythm. Newly arriving words
            gather as soft gold light, sharpen into gold lettering, then settle
            into the normal reading color. The luminous trail follows the text
            as it forms; completed words stay still.
          </p>
          <p>
            <a
              href="https://design.google/library/gemini-ai-visual-design"
              target="_blank"
              rel="noreferrer"
            >
              Google’s Gemini designers
            </a>{" "}
            describe a concentrated leading edge and diffused trail to convey
            energy and direction. This is Become’s gold interpretation of that
            principle, not a claim that Gemini uses this exact text animation.
          </p>
          <p>
            <a
              href="https://www.notion.com/help/guides/notion-ai-for-docs"
              target="_blank"
              rel="noreferrer"
            >
              Notion AI
            </a>{" "}
            writes on the document itself.{" "}
            <a
              href="https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them"
              target="_blank"
              rel="noreferrer"
            >
              Claude’s artifacts
            </a>{" "}
            give substantial content a dedicated surface. Those are layout
            references; their help pages do not verify an exact reveal
            animation.
          </p>
          <p>
            The first words appear immediately; a paragraph settles in about two
            to three seconds. The next paragraph waits until the preceding one
            finishes, then begins when visible. Motion pauses out of view or in
            a hidden tab, and keeps the full layout so the page does not jump.
            Completed prose stays still. Reduced motion shows everything
            immediately.
          </p>
          <p>
            This is a presentation of already-prepared text, not a simulation of
            model generation. Living Ink is now shared in Storybook and used for
            the onboarding summary. Terminal Prompt is reserved solely for
            C.O.T.S. speech. The full onboarding remains under review.
          </p>
        </div>
      </details>
    </main>
  );
}
