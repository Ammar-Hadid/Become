"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { Dialog } from "@/components/ui/dialogs/dialog.component";
import { AiGeneratedText } from "@/components/ui/ai-generated-text/ai-generated-text.component";
import { NEXO_INTERACTIVE_REQUEST_TIMEOUT_MS } from "@/features/nexo/constants/nexo-task.constants";
import { Pause, Play } from "lucide-react";
import "../styles/nexo-season-insight.css";

type Analysis = {
  summary: string;
  nextStep: string;
  evidence: { id: string; text: string }[];
};

export function NexoSeasonInsight() {
  const summaryId = useId();
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestPending = useRef(false);

  async function explain() {
    setOpen(true);
    if (requestPending.current) return;
    requestPending.current = true;
    setBusy(true);
    setError("");
    setAnalysis(null);
    const signal = AbortSignal.timeout(NEXO_INTERACTIVE_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/nexo/season-analysis", {
        method: "POST",
        signal,
      });
      const result = (await response.json()) as Analysis & {
        status?: string;
        reason?: string;
        error?: string;
      };
      if (!response.ok || result.status !== "READY")
        throw new Error(
          result.reason ??
            result.error ??
            "Nexo could not explain this Season yet.",
        );
      setAnalysis({
        summary: result.summary,
        nextStep: result.nextStep,
        evidence: result.evidence,
      });
    } catch (cause) {
      setError(
        signal.aborted
          ? "The analysis took too long. Please try again."
          : cause instanceof Error
          ? cause.message
          : "Nexo could not explain this Season yet.",
      );
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Button ref={triggerRef} variant="ghost" size="sm" onClick={explain}>
        Why this state?
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        eyebrow="Nexo"
        title="Season analysis"
        description="An explanation grounded in recorded Become facts. Goal arithmetic remains calculated by Become."
        returnFocusRef={triggerRef}
      >
        {busy && (
          <p className="type-body-sm" role="status">
            Nexo is reading the current Season facts…
          </p>
        )}
        {error && (
          <p className="nexo-season-error type-body-sm" role="alert">
            {error}
          </p>
        )}
        {analysis && !busy && (
          <div className="nexo-season-result">
            <Button
              variant="ghost"
              size="sm"
              style={{ justifySelf: "start" }}
              aria-pressed={paused}
              aria-controls={summaryId}
              onClick={() => setPaused((current) => !current)}
            >
              {paused ? (
                <Play aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
              {paused ? "Resume motion" : "Pause motion"}
            </Button>
            <AiGeneratedText
              id={summaryId}
              text={analysis.summary}
              paused={paused}
            />
            <div>
              <h3 className="type-widget-title">A useful next step</h3>
              <p className="type-body">{analysis.nextStep}</p>
            </div>
            <div>
              <h3 className="type-widget-title">Facts used</h3>
              <ul className="type-body-sm">
                {analysis.evidence.map((fact) => (
                  <li key={fact.id}>{fact.text}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
