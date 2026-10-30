"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Editor } from "@tiptap/core";
import "../styles/document-editor-guide.css";

/** Tracks the caret's rendered line, including lines created by wrapping. */
export function DocumentEditorGuide({
  editor,
  containerRef,
}: {
  editor: Editor | null;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const guideRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState({ top: 0, height: 0 });

  useEffect(() => {
    if (!editor) return;
    const container = containerRef.current;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const guide = guideRef.current;
        if (!guide || editor.isDestroyed) return;
        const caret = editor.view.coordsAtPos(editor.state.selection.head, 1);
        const top = Math.max(0, caret.top - guide.getBoundingClientRect().top);
        const height = caret.bottom - caret.top;
        setLine((previous) =>
          previous.top === top && previous.height === height
            ? previous
            : { top, height },
        );
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(editor.view.dom);
    if (container) observer.observe(container);
    editor.on("selectionUpdate", update);
    editor.on("update", update);
    window.addEventListener("resize", update);
    container?.addEventListener("scroll", update, true);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      editor.off("selectionUpdate", update);
      editor.off("update", update);
      window.removeEventListener("resize", update);
      container?.removeEventListener("scroll", update, true);
    };
  }, [editor, containerRef]);

  return (
    <div ref={guideRef} className="document-editor-guide" aria-hidden="true">
      <span style={{ transform: `translateY(${line.top}px)`, ...(line.height > 0 ? { height: `${line.height}px` } : {}) }} />
    </div>
  );
}
