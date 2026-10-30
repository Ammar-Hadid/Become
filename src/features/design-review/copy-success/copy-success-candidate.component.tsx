"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy } from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { usePromptClipboard } from "@/features/seasons/living/image-direction/hooks/use-prompt-clipboard.hook";
import "./copy-success-candidate.css";

const initialPrompt =
  "Create a cinematic Season banner for the approved character. Preserve their recognizable appearance and the approved world. Compose a separate desktop image with quiet space on the left for interface copy. No baked-in text or UI.";
/** Retained review route now renders the real approved shared Button. */
export function CopySuccessButtonCandidate({
  state,
  onClick,
}: {
  state: "idle" | "pending" | "success";
  onClick: () => void;
}) {
  return (
    <Button
      className="copy-feedback-button"
      feedback={{
        state,
        label: "Copy prompt",
        pendingLabel: "Copying…",
        successLabel: "Copied",
        icon: <Copy aria-hidden="true" />,
      }}
      aria-disabled={state === "pending" || undefined}
      onClick={onClick}
    />
  );
}

export function CopySuccessCandidate() {
  const [value, setValue] = useState(initialPrompt);
  const clipboard = usePromptClipboard(value);
  const [failNext, setFailNext] = useState(false);
  function copy() {
    if (failNext) {
      setFailNext(false);
      void clipboard.copy(async () => {
        throw new Error("Preview clipboard rejection");
      });
    } else void clipboard.copy();
  }
  return (
    <div className="copy-success-page">
      <header className="copy-success-page-header">
        <BrandMark />
        <Link href="/manual-season-imagery-candidate" className="type-body-sm">
          Back to imagery preview
        </Link>
        <span className="type-caption">Primary button · success candidate</span>
      </header>
      <main className="copy-success-page-main">
        <header className="copy-success-introduction">
          <p className="type-overline">A small moment of certainty</p>
          <h1 className="type-season-entry-title">Copied. Clearly.</h1>
          <p className="type-body-lg">
            A smooth change to green, a checkmark and a short confirmation—right
            where you clicked.
          </p>
        </header>
        <Card
          material="solid"
          spacing="action"
          className="copy-success-workspace"
        >
          <h2 className="type-section-title">Try the copy feedback</h2>
          <Textarea
            label="Sample image prompt"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={4}
            help="Editable preview text. This is the exact text the button copies."
          />
          <div className="copy-success-action">
            <CopySuccessButtonCandidate
              state={clipboard.state}
              onClick={copy}
            />
            <p
              className={`type-caption copy-success-message${clipboard.failed ? "copy-success-message--failed" : ""}`}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {clipboard.message}
            </p>
          </div>
          <p className="type-body-sm copy-success-note">
            The button keeps its width and your keyboard focus. After two
            seconds it returns to Copy prompt. Reduced motion changes the state
            immediately.
          </p>
        </Card>
        <details className="copy-success-test-controls">
          <summary className="type-caption">Preview controls</summary>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={failNext}
            onClick={() => setFailNext((current) => !current)}
          >
            {failNext ? "Cancel simulated failure" : "Fail next copy"}
          </Button>
          <p className="type-caption">
            A failed copy never turns the button green. Retry stays available.
          </p>
        </details>
        <p className="type-caption copy-success-note">
          Approved primary-button feedback. Storybook and the prompt drawers use
          this shared treatment.
        </p>
      </main>
    </div>
  );
}
