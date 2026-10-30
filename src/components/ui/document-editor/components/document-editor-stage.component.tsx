import type { Ref } from "react";
import { cn } from "@/lib/styles/utils/class-name.util";
import "../styles/document-editor-manuscript.css";

/** Shared editor canvas; domain toolbars, extensions, and save adapters are injected by wrappers. */
export function DocumentEditorStage({
  label,
  className,
  canvasClassName,
  canvasRef,
  children,
}: {
  label: string;
  className?: string;
  canvasClassName?: string;
  canvasRef?: Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <main className={cn("document-editor-stage", className)} aria-label={label}>
      <div
        ref={canvasRef}
        className={cn("document-editor-canvas", canvasClassName)}
      >
        {children}
      </div>
    </main>
  );
}
