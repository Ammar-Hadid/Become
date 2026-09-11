import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import "@/features/seasons/home/styles/season-home-card.css";
import { SeasonPoster } from "@/features/seasons/posters/components/season-poster.component";
import { SeasonQuoteExcerpt } from "@/features/seasons/media/components/season-quote-excerpt.component";
import type { SeasonView } from "@/features/seasons/types/season.types";

export function SeasonHomeCard({ season }: { season: SeasonView }) {
  const href = `/direction/seasons/${season.year}/${season.quarter}`;
  const primary = season.goals.find(({ role }) => role === "PRIMARY")?.goal;
  const chapterName =
    season.closingCard?.title.trim() ||
    season.title.trim() ||
    `Season ${season.quarter}`;
  const secondary = season.presentation.secondaryMediaId
    ? season.media.find(({ id }) => id === season.presentation.secondaryMediaId)
    : null;
  const dailyQuote = season.presentation.quoteId
    ? season.quotes.find(({ id }) => id === season.presentation.quoteId)
    : null;

  return (
    <section className="season-home" aria-labelledby="season-home-title">
      <header>
        <div>
          <p className="eyebrow">The chapter around today</p>
          <h2 id="season-home-title">
            {season.openingCompletedAt
              ? "Return to your direction."
              : "This season is ready for a shape."}
          </h2>
        </div>
        <Link href={season.openingCompletedAt ? href : `${href}/opening`}>
          {season.openingCompletedAt ? "Open season" : "Begin the opening"}{" "}
          <ArrowRight aria-hidden="true" />
        </Link>
      </header>
      <SeasonPoster
        season={season}
        variant="home"
        href={href}
        linkLabel={`Open ${chapterName}, Season ${season.quarter} ${season.year}`}
      />
      {(secondary || dailyQuote) && (
        <aside className="season-home-signal" aria-label="Season inspiration">
          {secondary && (
            // Authenticated local media cannot use the default image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={secondary.href}
              alt={secondary.decorative ? "" : secondary.alt}
              width={secondary.width}
              height={secondary.height}
              style={{
                objectPosition: `${secondary.focalX * 100}% ${secondary.focalY * 100}%`,
              }}
            />
          )}
          {dailyQuote && <SeasonQuoteExcerpt quote={dailyQuote} />}
          <span>For today</span>
        </aside>
      )}
      {primary && (
        <div className="season-home-reading">
          <Compass aria-hidden="true" />
          <span>
            <strong>{primary.title}</strong>
            <small>{primary.progressSummary}</small>
          </span>
          <Link href={`/direction/goals/${primary.id}`}>View goal</Link>
        </div>
      )}
    </section>
  );
}
