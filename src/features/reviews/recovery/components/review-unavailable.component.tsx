"use client";

import {
  Workspace,
  WorkspacePanel,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import Link from "next/link";
import { ArrowLeft, BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";

export function ReviewUnavailable({
  retry,
  season = false,
}: {
  retry: () => void;
  season?: boolean;
}) {
  if (season) return <SeasonUnavailable retry={retry} />;
  return (
    <Workspace area="direction" className="page-shell py-4xl" role="alert">
      <WorkspacePanel>
        <p className="eyebrow">{season ? "Season reading" : "Reviews"}</p>
        <h1 className="text-h1 mt-xl text-text-primary">
          {season
            ? "This Season could not be loaded."
            : "This reading could not be loaded."}
        </h1>
        <p className="text-body text-text-secondary mt-xl">
          The record is unavailable right now. You can try again or return to
          Become.
        </p>
        <div className="mt-3xl gap-xl flex flex-wrap items-center">
          <Button type="button" onClick={retry}>
            <RotateCcw className="size-lg" aria-hidden="true" /> Try again
          </Button>
          <WorkspaceLink
            href="/?reading=unavailable"
            className="text-body-sm text-text-secondary min-h-input-height-md gap-sm focus-visible:outline-primary inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <ArrowLeft className="size-lg" aria-hidden="true" /> Home
          </WorkspaceLink>
          <WorkspaceLink
            href="/reviews"
            className="text-body-sm text-primary min-h-input-height-md gap-sm focus-visible:outline-primary inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <BookOpen className="size-lg" aria-hidden="true" /> Reviews
          </WorkspaceLink>
        </div>
      </WorkspacePanel>
    </Workspace>
  );
}

// The approved opening shares this recovery boundary; retain its existing treatment.
function SeasonUnavailable({ retry }: { retry: () => void }) {
  const season = true;
  return (
    <section className="page-shell py-4xl" role="alert">
      <div className="max-w-copy">
        <p className="eyebrow">{season ? "Season reading" : "Reviews"}</p>
        <h1 className="text-h1 mt-xl text-text-primary">
          {season
            ? "This Season could not be loaded."
            : "This reading could not be loaded."}
        </h1>
        <p className="text-body text-text-secondary mt-xl">
          The record is unavailable right now. You can try again or return to
          Become.
        </p>
        <div className="mt-3xl gap-xl flex flex-wrap items-center">
          <Button type="button" onClick={retry}>
            <RotateCcw className="size-lg" aria-hidden="true" /> Try again
          </Button>
          <Link
            href="/?reading=unavailable"
            className="text-body-sm text-text-secondary min-h-input-height-md gap-sm focus-visible:outline-primary inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <ArrowLeft className="size-lg" aria-hidden="true" /> Home
          </Link>
          <Link
            href="/reviews"
            className="text-body-sm text-primary min-h-input-height-md gap-sm focus-visible:outline-primary inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <BookOpen className="size-lg" aria-hidden="true" /> Reviews
          </Link>
        </div>
      </div>
    </section>
  );
}
