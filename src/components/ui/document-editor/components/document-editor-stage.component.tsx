import { cn } from "@/lib/styles/utils/class-name.util";

/** Shared editor canvas; domain toolbars, extensions, and save adapters are injected by wrappers. */
export function DocumentEditorStage({
  label,
  className,
  canvasClassName,
  children,
}: {
  label: string;
  className?: string;
  canvasClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={cn("document-editor-stage", className)} aria-label={label}>
      <div className={cn("document-editor-canvas", canvasClassName)}>
        {children}
      </div>
    </main>
  );
}
