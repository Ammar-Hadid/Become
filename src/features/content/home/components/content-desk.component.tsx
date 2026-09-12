import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { ContentCreate } from "@/features/content/home/components/content-create.component";
import { ContentThumbnail } from "@/features/content/shared/components/content-thumbnail.component";
import type { ContentDesk as ContentDeskData } from "@/features/content/types/content.types";

function displayTitle(title: string) {
  return title.trim() || "Untitled content";
}

export function ContentDesk({
  data,
  query = "",
  includeArchived = false,
}: {
  data: ContentDeskData;
  query?: string;
  includeArchived?: boolean;
}) {
  const inProgress = data.items.filter(
    (item) => item.id !== data.continueMaking?.id,
  );

  return (
    <div className="page-shell content-shell">
      <header className="content-masthead">
        <div>
          <p className="eyebrow">Make the next one</p>
          <h1>Content</h1>
          <p>
            Shape an idea, make the right variant, then learn from every place
            it goes.
          </p>
        </div>
        <ContentCreate />
      </header>

      {data.continueMaking ? (
        <section className="content-continue" aria-labelledby="continue-title">
          <ContentThumbnail
            className="content-continue-image"
            url={data.continueMaking.thumbnailUrl}
            alt=""
            priority
          />
          <div className="content-continue-copy">
            <p className="eyebrow">Continue making</p>
            <h2 id="continue-title">
              {displayTitle(data.continueMaking.title)}
            </h2>
            <p>{data.continueMaking.purpose || data.continueMaking.nextStep}</p>
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
            <Link
              href={data.continueMaking.href}
              className="content-text-action"
            >
              Open the workspace <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <section
          className="content-empty-lead"
          aria-labelledby="empty-content-title"
        >
          <p className="eyebrow">A clear page</p>
          <h2 id="empty-content-title">What should exist next?</h2>
          <p>
            Begin with a thought you have already kept, or start with a blank
            working title.
          </p>
          <div>
            <ContentCreate triggerLabel="Start with a blank page" />
            <Link href="/direction/ideas" className="content-secondary-action">
              Browse ideas
            </Link>
          </div>
        </section>
      )}

      <section className="content-source" aria-labelledby="source-title">
        <header>
          <div>
            <p className="eyebrow">Source material</p>
            <h2 id="source-title">Thoughts worth making real</h2>
          </div>
          <Link href="/direction/ideas" className="content-quiet-link">
            Browse all ideas <ArrowUpRight aria-hidden="true" />
          </Link>
        </header>
        {data.ideas.length ? (
          <ol>
            {data.ideas.slice(0, 3).map((idea, index) => (
              <li key={idea.id}>
                <span className="timer-numerals" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
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
          <p className="content-source-empty">
            Your latest open ideas, including unclassified thoughts, will wait
            here when there is something to make from.
          </p>
        )}
      </section>

      <section className="content-index" aria-labelledby="content-index-title">
        <header>
          <div>
            <p className="eyebrow">In progress</p>
            <h2 id="content-index-title">The work on your desk</h2>
          </div>
          <form className="content-search" action="/content">
            <Search aria-hidden="true" />
            <label>
              <span className="sr-only">Search content</span>
              <input
                name="q"
                defaultValue={query}
                placeholder="Search the desk"
              />
            </label>
            {includeArchived && (
              <input type="hidden" name="archived" value="true" />
            )}
          </form>
        </header>
        {inProgress.length ? (
          <ol className="content-rows">
            {inProgress.map((item) => (
              <li key={item.id}>
                <Link href={item.href}>
                  <ContentThumbnail url={item.thumbnailUrl} alt="" />
                  <span className="content-row-copy">
                    <strong>{displayTitle(item.title)}</strong>
                    <span>
                      {item.purpose || item.nextStep || "Ready for a next move"}
                    </span>
                  </span>
                  <span className="content-row-stage">{item.stageLabel}</span>
                  <span className="content-row-counts">
                    {item.variantCount}{" "}
                    {item.variantCount === 1 ? "variant" : "variants"}
                    <i aria-hidden="true">·</i>
                    {item.publicationCount}{" "}
                    {item.publicationCount === 1 ? "release" : "releases"}
                  </span>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="content-index-empty">
            {query
              ? "Nothing on the desk matches that search."
              : "No other work is waiting."}
          </p>
        )}
      </section>

      {data.recentPublications.length > 0 && (
        <section className="content-recent" aria-labelledby="recent-title">
          <header>
            <p className="eyebrow">Recently released</p>
            <h2 id="recent-title">Out in the world</h2>
          </header>
          <ol>
            {data.recentPublications.map((release) => (
              <li key={release.id}>
                <Link href={release.href}>
                  <ContentThumbnail url={release.thumbnailUrl} alt="" />
                  <span className="content-row-copy">
                    <strong>{displayTitle(release.contentTitle)}</strong>
                    <span>
                      {release.variantName} · {release.channelName}
                    </span>
                  </span>
                  <time dateTime={release.publishedOn}>
                    {release.publishedOn}
                  </time>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
