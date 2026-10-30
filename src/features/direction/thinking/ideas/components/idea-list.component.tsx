"use client";

import { Button } from "@/components/ui/buttons/button.component";

import { Card } from "@/components/ui/cards/card.component";

import { Input } from "@/components/ui/forms/input.component";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, Check, ChevronDown, Search } from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import {
  SubMenu,
  useSubMenuClose,
} from "@/components/ui/menus/submenu.component";
import { IdeaCapture } from "@/features/direction/thinking/ideas/components/idea-capture.component";
import { useThinkingPage } from "@/features/direction/thinking/shared/hooks/use-thinking-page.hook";
import type {
  IdeaView,
  ThinkingPage,
} from "@/features/direction/thinking/types/thinking.types";
import type { OwnedOption } from "@/features/direction/types/direction.types";

function DomainChoice({
  active,
  label,
  onChoose,
}: {
  active: boolean;
  label: string;
  onChoose: () => void;
}) {
  const close = useSubMenuClose();
  return (
    <MenuItem
      role="menuitemradio"
      checked={active}
      onSelect={() => {
        onChoose();
        close(true);
      }}
    >
      <span>{label}</span>
      {active && <Check aria-hidden="true" />}
    </MenuItem>
  );
}

export function IdeaList({
  initialData,
  domains,
  query = "",
  domainId = "",
  cursor = "",
  archived = false,
}: {
  initialData: ThinkingPage<IdeaView>;
  domains: OwnedOption[];
  query?: string;
  domainId?: string;
  cursor?: string;
  archived?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const pageIdentity = `${query}:${domainId}:${archived}:${cursor}`;
  const pageQuery = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("cursor");
    return next;
  }, [searchParams]);
  const page = useThinkingPage({
    identity: pageIdentity,
    initialData,
    endpoint: "/api/direction/thinking/ideas",
    query: pageQuery,
  });
  const [searchState, setSearchState] = useState({
    identity: pageIdentity,
    value: query,
  });
  const searchValue =
    searchState.identity === pageIdentity ? searchState.value : query;

  function navigate(patch: {
    q?: string;
    domainId?: string;
    archived?: boolean;
  }) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("cursor");
    if (patch.q !== undefined) {
      const normalized = patch.q.trim();
      if (normalized) next.set("q", normalized);
      else next.delete("q");
    }
    if (patch.domainId !== undefined) {
      if (patch.domainId) next.set("domainId", patch.domainId);
      else next.delete("domainId");
    }
    if (patch.archived !== undefined) {
      if (patch.archived) next.set("archived", "true");
      else next.delete("archived");
    }
    const suffix = next.toString();
    startTransition(() => {
      router.push(`${pathname}${suffix ? `?${suffix}` : ""}`, {
        scroll: false,
      });
    });
  }

  const selectedDomain = domains.find((domain) => domain.id === domainId);
  return (
    <div className="thinking-page idea-page" aria-busy={pending}>
      <header className="thinking-masthead">
        <div>
          <p className="eyebrow">A place for unfinished thoughts</p>
          <h1>Ideas</h1>
          <p>
            Keep what catches your attention. Decide what it becomes only when
            you are ready.
          </p>
        </div>
      </header>

      {!archived && <IdeaCapture domains={domains} onSaved={page.prepend} />}

      <div className="thinking-filters">
        <form
          className="thinking-search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: searchValue });
            requestAnimationFrame(() => searchRef.current?.focus());
          }}
        >
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="idea-search">
            Search ideas
          </label>
          <Input
            ref={searchRef}
            id="idea-search"
            value={searchValue}
            onChange={(event) =>
              setSearchState({
                identity: pageIdentity,
                value: event.target.value,
              })
            }
            placeholder="Search your ideas"
          />
          <button type="submit">Search</button>
        </form>
        <SubMenu
          label="Filter ideas by domain"
          placement="bottom-end"
          closeOnSelect={false}
          trigger={(props) => (
            <button {...props} className="thinking-filter-trigger">
              <span>{selectedDomain?.name ?? "Every domain"}</span>
              <ChevronDown aria-hidden="true" />
            </button>
          )}
        >
          <DomainChoice
            active={!domainId}
            label="Every domain"
            onChoose={() => navigate({ domainId: "" })}
          />
          {domains.map((domain) => (
            <DomainChoice
              key={domain.id}
              active={domain.id === domainId}
              label={domain.name}
              onChoose={() => navigate({ domainId: domain.id })}
            />
          ))}
        </SubMenu>
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

      {page.items.length ? (
        <ol className="idea-stream">
          {page.items.map((idea) => (
            <li key={idea.id}>
              <time dateTime={idea.createdAt}>
                {new Date(idea.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </time>
              <Link href={`/direction/ideas/${idea.id}`} scroll={false}>
                <span className="idea-stream-copy">
                  <strong>{idea.title}</strong>
                  {idea.notes && <span>{idea.notes}</span>}
                </span>
                <span className="idea-stream-context">
                  {idea.domains.map((domain) => domain.name).join(" · ") ||
                    "Unclassified"}
                  {idea.outputsCount > 0 && (
                    <small>
                      Inspired {idea.outputsCount}{" "}
                      {idea.outputsCount === 1 ? "thing" : "things"}
                    </small>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <Card className="thinking-empty" aria-label="No ideas">
          <p className="eyebrow">
            {archived ? "The archive is quiet" : "Nothing parked here yet"}
          </p>
          <h3>
            {archived
              ? "Ideas you set aside will wait here."
              : "Start with a sentence you do not want to lose."}
          </h3>
          <p>
            {archived
              ? "Return to active Ideas whenever you are ready."
              : "The composer above is enough. Domains and destinations can wait."}
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
          {page.pending ? "Loading…" : "More ideas"}
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
