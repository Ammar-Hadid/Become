"use client";

import { Button } from "@/components/ui/buttons/button.component";

import { Card } from "@/components/ui/cards/card.component";

import { Input } from "@/components/ui/forms/input.component";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, Search } from "lucide-react";
import { DecisionDialog } from "@/features/direction/thinking/decisions/components/decision-editor.component";
import { useThinkingPage } from "@/features/direction/thinking/shared/hooks/use-thinking-page.hook";
import type {
  DecisionView,
  ThinkingOptions,
  ThinkingPage,
} from "@/features/direction/thinking/types/thinking.types";

const assessmentLabel = {
  HELPFUL: "Helpful",
  MIXED: "Mixed",
  NOT_HELPFUL: "Not helpful",
  TOO_EARLY: "Too early to tell",
} as const;

export function DecisionList({
  initialData,
  options,
  defaultDecidedOn,
  query = "",
  cursor = "",
  archived = false,
}: {
  initialData: ThinkingPage<DecisionView>;
  options: ThinkingOptions;
  defaultDecidedOn: string;
  query?: string;
  cursor?: string;
  archived?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const pageIdentity = `${query}:${archived}:${cursor}`;
  const pageQuery = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("cursor");
    return next;
  }, [searchParams]);
  const page = useThinkingPage({
    identity: pageIdentity,
    initialData,
    endpoint: "/api/direction/thinking/decisions",
    query: pageQuery,
  });
  const [searchState, setSearchState] = useState({
    identity: pageIdentity,
    value: query,
  });
  const searchValue =
    searchState.identity === pageIdentity ? searchState.value : query;

  function navigate(patch: { q?: string; archived?: boolean }) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("cursor");
    if (patch.q !== undefined) {
      const normalized = patch.q.trim();
      if (normalized) next.set("q", normalized);
      else next.delete("q");
    }
    if (patch.archived !== undefined) {
      if (patch.archived) next.set("archived", "true");
      else next.delete("archived");
    }
    const suffix = next.toString();
    startTransition(() =>
      router.push(`${pathname}${suffix ? `?${suffix}` : ""}`, {
        scroll: false,
      }),
    );
  }

  return (
    <div className="thinking-page decision-page" aria-busy={pending}>
      <header className="thinking-masthead">
        <div>
          <p className="eyebrow">A record of chosen paths</p>
          <h1>Decisions</h1>
          <p>
            Keep the choice beside the reason. Return later to see what held up,
            what changed, and why.
          </p>
        </div>
        {!archived && (
          <DecisionDialog
            options={options}
            defaultDecidedOn={defaultDecidedOn}
            onSaved={(decision) => page.prepend(decision)}
          />
        )}
      </header>

      <div className="thinking-filters thinking-filters--compact">
        <form
          className="thinking-search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: searchValue });
            requestAnimationFrame(() => searchRef.current?.focus());
          }}
        >
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="decision-search">
            Search decisions
          </label>
          <Input
            ref={searchRef}
            id="decision-search"
            value={searchValue}
            onChange={(event) =>
              setSearchState({
                identity: pageIdentity,
                value: event.target.value,
              })
            }
            placeholder="Search choices and reasons"
          />
          <button type="submit">Search</button>
        </form>
        <button
          type="button"
          className="thinking-archive-toggle"
          aria-pressed={archived}
          onClick={() => navigate({ archived: !archived })}
        >
          <Archive aria-hidden="true" />
          {archived ? "Back to active" : "Archive"}
        </button>
      </div>

      {page.items.length > 0 ? (
        <ol className="decision-journal">
          {page.items.map((decision) => {
            const reflection = decision.reflections[0];
            return (
              <li key={decision.id}>
                <time dateTime={decision.decidedOn}>
                  {new Date(
                    `${decision.decidedOn}T12:00:00`,
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <Link
                  href={`/direction/decisions/${decision.id}`}
                  scroll={false}
                >
                  <strong>{decision.choice}</strong>
                  <span>{decision.reason}</span>
                  <small>
                    {reflection
                      ? `Latest reflection · ${assessmentLabel[reflection.assessment]}`
                      : decision.links.length
                        ? `Related to ${decision.links.map((link) => link.label).join(" · ")}`
                        : "Open decision"}
                  </small>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <Card className="thinking-empty" aria-label="No decisions">
          <p className="eyebrow">
            {archived ? "The archive is quiet" : "No decisions recorded yet"}
          </p>
          <h3>
            {archived
              ? "Past choices you archive will wait here."
              : "Begin with a choice your future self may need to understand."}
          </h3>
          <p>
            A decision needs a choice and a reason. Everything else can wait.
          </p>
        </Card>
      )}

      {page.nextCursor && (
        <Button
          variant="secondary"
          type="button"
          onClick={() => void page.loadMore()}
          disabled={page.pending}
        >
          {page.pending ? "Loading…" : "More decisions"}
        </Button>
      )}
      {page.error && (
        <p className="thinking-pagination-error" role="alert">
          {page.error}
        </p>
      )}
    </div>
  );
}
