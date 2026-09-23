"use client";

import { useEffect, useId, useRef, useState } from "react";
import { NotebookText, X } from "lucide-react";

export function ExplorationFieldNotes({
  label = "Field notes",
  inline = false,
  children,
}: {
  label?: string;
  inline?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const id = useId();
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1240px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (inline || !open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel
      ?.querySelector<HTMLElement>("button, a, input, select, textarea")
      ?.focus();

    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      trigger?.focus({ preventScroll: true });
    };
  }, [inline, open]);

  if (inline) {
    return (
      <aside
        className="exploration-field-notes exploration-field-notes--inline"
        aria-label={label}
      >
        <header className="exploration-field-notes-heading">
          <p>{label}</p>
        </header>
        {children}
      </aside>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="exploration-field-notes-trigger"
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <NotebookText aria-hidden="true" />
        {label}
      </button>
      <button
        type="button"
        className="exploration-field-notes-scrim"
        aria-label={`Close ${label}`}
        tabIndex={open ? 0 : -1}
        data-open={open || undefined}
        onClick={() => setOpen(false)}
      />
      <aside
        ref={panelRef}
        id={id}
        className="exploration-field-notes"
        data-open={open || undefined}
        aria-label={label}
        role={compact ? "dialog" : undefined}
        aria-modal={compact ? true : undefined}
        aria-hidden={compact && !open ? true : undefined}
        inert={compact && !open ? true : undefined}
      >
        <header className="exploration-field-notes-heading">
          <p className="eyebrow">{label}</p>
          <button
            type="button"
            aria-label={`Close ${label}`}
            onClick={() => setOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </aside>
    </>
  );
}
