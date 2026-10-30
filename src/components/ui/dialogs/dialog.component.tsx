"use client";

import {
  useCallback,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import { cn } from "@/lib/styles/utils/class-name.util";

export function Dialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
  footer,
  closeLabel = "Close dialog",
  initialFocusRef,
  returnFocusRef,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const presence = usePresence(open, "surface");
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useModalLayer({
    open,
    containerRef: panelRef,
    initialFocusRef,
    returnFocusRef,
    onClose: close,
  });

  if (!presence.isPresent || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="become-dialog-backdrop"
      data-state={presence.presenceState}
      aria-hidden={!open || undefined}
      inert={presence.isExiting || undefined}
      onAnimationEnd={presence.onPresenceAnimationEnd}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        className={cn("become-dialog", className)}
        role="dialog"
        aria-modal={open || undefined}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-modal-layer={open ? "open" : "closed"}
        tabIndex={-1}
      >
        <header className="become-dialog__header">
          <div className="become-dialog__copy">
            {eyebrow ? (
              <p className="type-overline become-dialog__eyebrow">{eyebrow}</p>
            ) : null}
            <h2 className="type-widget-title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p
                className="type-body become-dialog__description"
                id={descriptionId}
              >
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={closeLabel}
            onClick={close}
          >
            <X aria-hidden="true" />
          </Button>
        </header>
        {children ? (
          <div className="become-dialog__body">{children}</div>
        ) : null}
        {footer ? (
          <footer className="become-dialog__footer">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
