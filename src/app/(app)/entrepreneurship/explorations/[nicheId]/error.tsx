"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { WorkspacePanel } from "@/components/ui/workspace/workspace.component";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert">
      <WorkspacePanel
        title="This exploration couldn’t load."
        description="Try again to return to your exploration."
        actions={
          <Button type="button" variant="secondary" onClick={retry}>
            Try again
          </Button>
        }
      >
        {error.digest && (
          <p className="text-body-sm text-text-muted">
            Reference {error.digest}
          </p>
        )}
      </WorkspacePanel>
    </div>
  );
}
