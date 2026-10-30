"use client";
import { useEffect, useRef, useState } from "react";
/** Confirmation hold belongs to the copying workflow, not visual motion. */
export const PROMPT_COPY_CONFIRMATION_MS = 2000;
type Outcome = {
  value: string;
  context: string;
  state: "idle" | "pending" | "success";
  message: string;
  failed: boolean;
};

export function usePromptClipboard(value: string, context = value) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const sequence = useRef(0);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    locked.current = false;
    return () => {
      sequence.current += 1;
      locked.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, context]);
  async function copy(writeText?: (value: string) => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    const operation = ++sequence.current;
    if (timer.current) clearTimeout(timer.current);
    setOutcome({
      value,
      context,
      state: "pending",
      message: "",
      failed: false,
    });
    try {
      if (writeText) await writeText(value);
      else {
        if (!navigator.clipboard?.writeText)
          throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(value);
      }
      if (operation !== sequence.current) return;
      setOutcome({
        value,
        context,
        state: "success",
        message: "Prompt copied to clipboard.",
        failed: false,
      });
      timer.current = setTimeout(() => {
        if (operation === sequence.current) setOutcome(null);
      }, PROMPT_COPY_CONFIRMATION_MS);
    } catch {
      if (operation === sequence.current)
        setOutcome({
          value,
          context,
          state: "idle",
          message:
            "Copy failed. Select and copy the prompt manually, or try again.",
          failed: true,
        });
    } finally {
      if (operation === sequence.current) locked.current = false;
    }
  }
  const current =
    outcome?.value === value && outcome.context === context ? outcome : null;
  return {
    state: current?.state ?? "idle",
    message: current?.message ?? "",
    failed: current?.failed ?? false,
    copy,
  };
}
