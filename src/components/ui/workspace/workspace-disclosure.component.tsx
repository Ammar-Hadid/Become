"use client";

import { useContext, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { InterfaceSoundContext } from "@/components/ui/sound/components/interface-sound-provider.component";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./workspace.css";

/** Children stay mounted so drafts, native validation, and form data survive collapse. */
export function WorkspaceDisclosure({
  title,
  description,
  children,
  defaultOpen = false,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const sound = useContext(InterfaceSoundContext);
  return (
    <details
      className={cn("workspace-disclosure", className)}
      open={defaultOpen}
      onInvalidCapture={(event) => {
        // Native validation must be able to focus an invalid field even when
        // its optional section was collapsed after editing.
        event.currentTarget.open = true;
      }}
    >
      <summary onClick={() => sound?.play("controlConfirmed")}>
        <span>
          <strong>{title}</strong>
          {description && <small>{description}</small>}
        </span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="workspace-disclosure-content">{children}</div>
    </details>
  );
}
