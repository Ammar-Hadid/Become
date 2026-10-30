import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { ViewTransition } from "react";
import "@/features/seasons/posters/styles/season-poster.css";
import type { SeasonView } from "@/features/seasons/types/season.types";
import { cn } from "@/lib/styles/utils/class-name.util";
import { SeasonPosterImage } from "@/features/seasons/posters/components/season-poster-image.component";
import { SeasonQuoteExcerpt } from "@/features/seasons/media/components/season-quote-excerpt.component";

function posterTitle(season: SeasonView) {
  if (season.closingCard) {
    return season.closingCard.title.trim() || `Season ${season.quarter}`;
  }
  return season.title.trim() || `Season ${season.quarter}`;
}

function posterDirection(season: SeasonView) {
  if (season.closingCard) {
    return (
      season.closingCard.primaryGoal?.title ||
      season.closingCard.intention.trim() ||
      "A season preserved without a single named direction."
    );
  }
  return (
    season.goals.find(({ role }) => role === "PRIMARY")?.goal.title ||
    season.intention.trim() ||
    "Give this season a direction when you are ready."
  );
}

export function SeasonPoster({
  season,
  variant = "detail",
  href,
  linkLabel,
}: {
  season: SeasonView;
  variant?: "home" | "detail" | "archive";
  href?: string;
  linkLabel?: string;
}) {
  const media = season.closingCard?.media ?? season.media;
  const quotes = season.closingCard?.quotes ?? season.quotes;
  const character = season.closingCard?.character ?? season.character;
  const poster = media.find((item) => item.poster);
  const quote = quotes.find((item) => item.featured);
  const standards = character.standards.slice(0, 2);
  const content = (
    <ViewTransition
      name={`season-poster-${season.year}-${season.quarter}`}
      share="motion-carry"
      default="none"
    >
      <article
        className={cn("season-poster", `season-poster--${variant}`)}
        data-has-image={Boolean(poster) || undefined}
      >
        <div className="season-poster-copy">
          <div className="season-poster-context">
            <span>{season.calendar.label}</span>
            <span aria-hidden="true">·</span>
            <span>{season.calendar.timeLabel}</span>
          </div>
          <p className="eyebrow">
            {season.cotsIdentity?.subjectKind === "PERSON"
              ? "Person of the season"
              : "Character of the season"}
          </p>
          {character.name && (
            <p className="season-poster-character">
              <strong>{character.name}</strong>
              {character.sourceWork && <span>{character.sourceWork}</span>}
            </p>
          )}
          <h2>{posterTitle(season)}</h2>
          <p className="season-poster-direction">{posterDirection(season)}</p>
          {standards.length > 0 && (
            <ul className="season-poster-traits" aria-label="Chosen traits">
              {standards.map((standard) => (
                <li key={standard.key}>{standard.trait}</li>
              ))}
            </ul>
          )}
          {quote && variant !== "archive" && (
            <SeasonQuoteExcerpt quote={quote} />
          )}
          {href && (
            <span className="season-poster-link">
              Open this season <ArrowUpRight aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="season-poster-visual">
          <SeasonPosterImage poster={poster} character={character} />
          <span className="season-poster-date">
            <CalendarDays aria-hidden="true" />
            {season.closingCard
              ? `Captured ${new Date(season.closingCard.capturedAt).toLocaleDateString()}`
              : `Day ${season.calendar.dayNumber} of ${season.calendar.totalDays}`}
          </span>
        </div>
      </article>
    </ViewTransition>
  );

  return href ? (
    <Link
      className="season-poster-anchor"
      href={href}
      aria-label={
        linkLabel ??
        `Open ${posterTitle(season)}, Season ${season.quarter} ${season.year}`
      }
    >
      {content}
    </Link>
  ) : (
    content
  );
}
