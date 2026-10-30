import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { Input } from "@/components/ui/forms/input.component";
import { Button } from "@/components/ui/buttons/button.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import {
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import { ContentCreate } from "@/features/content/home/components/content-create.component";
import { ContentThumbnail } from "@/features/content/shared/components/content-thumbnail.component";
import type { ContentDesk as ContentDeskData } from "@/features/content/types/content.types";

const displayTitle = (title: string) => title.trim() || "Untitled content";

export function ContentDesk({
  data,
  query = "",
  includeArchived = false,
  hasPrevious = false,
}: {
  data: ContentDeskData;
  query?: string;
  includeArchived?: boolean;
  hasPrevious?: boolean;
}) {
  const items = data.items.filter(
    (item) => item.id !== data.continueMaking?.id,
  );
  const url = (options: { cursor?: string; archived?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (options.archived ?? includeArchived) params.set("archived", "true");
    if (options.cursor) params.set("cursor", options.cursor);
    return `/content${params.size ? `?${params}` : ""}`;
  };
  return (
    <div className="page-shell content-shell content-desk-workspace">
      <WorkspaceHeader
        eyebrow="Content"
        title="Make the next one."
        description="Pick up your work, shape the next idea, or see what you released."
        actions={<ContentCreate />}
      />
      <div className="content-desk-grid">
        {data.continueMaking ? (
          <WorkspacePanel
            className="content-continue-card"
            material="elevated-glass"
          >
            <ContentThumbnail
              className="content-continue-art"
              url={data.continueMaking.thumbnailUrl}
              alt=""
              priority
            />
            <div className="content-continue-summary">
              <p className="eyebrow">Continue making</p>
              <h2>{displayTitle(data.continueMaking.title)}</h2>
              <p>
                {data.continueMaking.purpose || data.continueMaking.nextStep}
              </p>
              <dl>
                <div>
                  <dt>Now</dt>
                  <dd>{data.continueMaking.stageLabel}</dd>
                </div>
                <div>
                  <dt>Next</dt>
                  <dd>{data.continueMaking.nextStep || "Keep shaping it"}</dd>
                </div>
              </dl>
              <WorkspaceLink href={data.continueMaking.href}>
                Open the workspace <ArrowRight />
              </WorkspaceLink>
            </div>
          </WorkspacePanel>
        ) : (
          <WorkspacePanel
            className="content-continue-card content-continue-card--empty"
            material="elevated-glass"
          >
            <EmptyState
              pattern="editorial-canvas"
              area="content"
              title="What should exist next?"
              description="Start with a working title. The brief, script, and releases can take shape as you go."
              action={<ContentCreate triggerLabel="Start with a blank page" />}
            />
          </WorkspacePanel>
        )}
        <WorkspacePanel
          title="Ideas to build on"
          description="Your latest open thoughts"
          className="content-ideas-card"
          actions={
            <WorkspaceLink href="/direction/ideas" variant="ghost">
              All ideas <ArrowUpRight />
            </WorkspaceLink>
          }
        >
          {data.ideas.length ? (
            <ol className="content-idea-list">
              {data.ideas.slice(0, 3).map((idea) => (
                <li key={idea.id}>
                  <Link href={idea.href}>{idea.label}</Link>
                  <ContentCreate
                    ideaId={idea.id}
                    triggerLabel="Create content"
                    variant="secondary"
                  />
                </li>
              ))}
            </ol>
          ) : (
            <p className="content-quiet-empty">
              Saved ideas will appear here. You can also begin with a blank
              page.
            </p>
          )}
        </WorkspacePanel>
        <WorkspacePanel
          title="The work on your desk"
          description={
            includeArchived ? "Active and archived work" : "Your active work"
          }
          className="content-library-card"
          actions={
            <WorkspaceLink
              href={url({ archived: !includeArchived })}
              variant="ghost"
            >
              {includeArchived ? "Hide archived" : "Include archived"}
            </WorkspaceLink>
          }
        >
          <form className="content-library-search" action="/content">
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search your content"
              aria-label="Search content"
            />
            {includeArchived && (
              <input type="hidden" name="archived" value="true" />
            )}
            <Button type="submit" variant="secondary">
              <Search /> Search
            </Button>
          </form>
          {items.length ? (
            <ol className="content-library-list">
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href}>
                    <ContentThumbnail url={item.thumbnailUrl} alt="" />
                    <span className="content-library-copy">
                      <strong>{displayTitle(item.title)}</strong>
                      <small>
                        {item.purpose ||
                          item.nextStep ||
                          "Ready for your next step"}
                      </small>
                      <span>
                        {item.stageLabel}
                        {item.archivedAt ? " · Archived" : ""} ·{" "}
                        {item.variantCount}{" "}
                        {item.variantCount === 1 ? "variant" : "variants"} ·{" "}
                        {item.publicationCount}{" "}
                        {item.publicationCount === 1 ? "release" : "releases"}
                      </span>
                    </span>
                    <ArrowRight aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              pattern={query ? "search-echo" : "publication-pause"}
              area="content"
              size="compact"
              title={query ? "No matching work" : "Nothing else on your desk"}
              description={
                query
                  ? "Try another title or include archived work."
                  : "Your next piece starts with a working title."
              }
            />
          )}
          {(data.nextCursor || hasPrevious) && (
            <nav
              className="content-library-pagination"
              aria-label="Content pages"
            >
              {hasPrevious && (
                <WorkspaceLink href={url()} variant="secondary">
                  Back to latest
                </WorkspaceLink>
              )}
              {data.nextCursor && (
                <WorkspaceLink
                  href={url({ cursor: data.nextCursor })}
                  variant="secondary"
                >
                  Older work <ArrowRight />
                </WorkspaceLink>
              )}
            </nav>
          )}
        </WorkspacePanel>
        <WorkspacePanel
          title="Out in the world"
          description="Recently released"
          className="content-releases-card"
        >
          {data.recentPublications.length ? (
            <ol className="content-release-shortlist">
              {data.recentPublications.map((release) => (
                <li key={release.id}>
                  <Link href={release.href}>
                    <ContentThumbnail url={release.thumbnailUrl} alt="" />
                    <span>
                      <strong>{displayTitle(release.contentTitle)}</strong>
                      <small>
                        {release.variantName} · {release.channelName}
                      </small>
                      <time dateTime={release.publishedOn}>
                        {release.publishedOn}
                      </time>
                    </span>
                    <ArrowUpRight aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              pattern="publication-pause"
              area="content"
              size="compact"
              title="Your releases will live here"
              description="Record a release from a variant when it goes out."
            />
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}
