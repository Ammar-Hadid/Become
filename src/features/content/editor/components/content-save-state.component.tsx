"use client";

import { Check, CircleAlert, Copy, RefreshCw } from "lucide-react";
import type { ContentAutosaveStatus } from "@/features/content/editor/hooks/use-content-autosave.hook";

export function ContentSaveState({
  status,
  savedAt,
  error,
  copyText,
  onRetry,
  latestText,
  onUseLatest,
}: {
  status: ContentAutosaveStatus;
  savedAt?: string;
  error?: string | null;
  copyText: string;
  onRetry: () => void;
  latestText?: string;
  onUseLatest?: () => void;
}) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="content-save-state" role="status">
        <span className="content-save-pulse" aria-hidden="true" /> Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="content-save-state" role="status">
        <Check aria-hidden="true" />
        {savedAt
          ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Saved"}
      </span>
    );
  }

  return (
    <div className="content-save-problem" role="status" aria-live="polite">
      <CircleAlert aria-hidden="true" />
      <span>
        <strong>
          {status === "conflict"
            ? "A newer copy exists."
            : "Still on this page."}
        </strong>
        <small>
          {error ||
            (status === "conflict"
              ? "Your words are preserved here while you review the latest saved copy."
              : "The save did not finish. Retry or copy your draft before leaving.")}
        </small>
      </span>
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(copyText)}
      >
        <Copy aria-hidden="true" /> Copy draft
      </button>
      {status === "conflict" && latestText && (
        <details className="content-save-comparison">
          <summary>Compare copies</summary>
          <div>
            <section>
              <strong>Your draft</strong>
              <pre>{copyText}</pre>
            </section>
            <section>
              <strong>Latest saved</strong>
              <pre>{latestText}</pre>
            </section>
          </div>
        </details>
      )}
      {status === "conflict" && onUseLatest ? (
        <button type="button" onClick={onUseLatest}>
          <RefreshCw aria-hidden="true" /> Use latest
        </button>
      ) : (
        <button type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}
