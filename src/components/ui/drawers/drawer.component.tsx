"use client";

import {
  useRef,
  type AnimationEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import type { MotionPresenceState } from "@/components/ui/motion/hooks/use-presence.hook";
import { cn } from "@/lib/styles/utils/class-name.util";

type DrawerProps = {
  open: boolean;
  presenceState: MotionPresenceState;
  exiting: boolean;
  onPresenceAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  domain?: string;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  backdropClassName?: string;
  testId?: string;
  backdropTestId?: string;
};

export function Drawer({
  open,
  presenceState,
  exiting,
  onPresenceAnimationEnd,
  onClose,
  titleId,
  descriptionId,
  domain = "default",
  header,
  children,
  footer,
  initialFocusRef,
  returnFocusRef,
  className,
  backdropClassName,
  testId,
  backdropTestId,
}: DrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);

  useModalLayer({
    open,
    containerRef: drawerRef,
    initialFocusRef,
    returnFocusRef,
    onClose,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("become-drawer-backdrop", backdropClassName)}
      data-state={presenceState}
      aria-hidden={!open || undefined}
      inert={exiting || undefined}
      onAnimationEnd={onPresenceAnimationEnd}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid={backdropTestId}
    >
      <aside
        ref={drawerRef}
        className={cn("become-drawer become-drawer-domain-theme", className)}
        data-domain={domain}
        role="dialog"
        aria-modal={open || undefined}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-modal-layer={open ? "open" : "closed"}
        tabIndex={-1}
        data-testid={testId}
      >
        <header className="become-drawer__header">{header}</header>
        <div className="become-drawer__body">{children}</div>
        {footer ? (
          <footer className="become-drawer__footer">{footer}</footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
