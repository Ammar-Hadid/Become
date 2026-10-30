"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import {
  Workspace,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";

export default function DirectionError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <Workspace area="direction" className="page-shell">
      <WorkspacePanel role="alert">
        <p className="eyebrow">Direction paused</p>
        <h1>This season could not be loaded.</h1>
        <p>
          Your saved season and goals have not changed. Try loading this view
          again.
        </p>
        <Button type="button" onClick={retry}>
          <RotateCcw aria-hidden="true" /> Try again
        </Button>
      </WorkspacePanel>
    </Workspace>
  );
}
