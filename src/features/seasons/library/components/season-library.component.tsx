import { Input } from "@/components/ui/forms/input.component";
import { Button } from "@/components/ui/buttons/button.component";
import Link from "next/link";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { SeasonPoster } from "@/features/seasons/posters/components/season-poster.component";
import { CharacterBanner } from "@/components/ui/character-banner/character-banner.component";
import type { PageResult } from "@/features/direction/types/direction.types";
import type { SeasonView } from "@/features/seasons/types/season.types";
import "../styles/season-library.css";

export function SeasonLibrary({
  result,
  search,
}: {
  result: PageResult<SeasonView>;
  search: string;
}) {
  return (
    <section
      className="direction-library"
      aria-labelledby="season-library-title"
    >
      <header className="direction-section-heading">
        <div>
          <p className="eyebrow">Your seasons</p>
          <h1 id="season-library-title">Season library</h1>
          <p>
            Your characters, artwork, and memories, kept together by Season.
          </p>
        </div>
      </header>
      <form className="direction-search" action="/direction/seasons">
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor="season-search">
          Search seasons
        </label>
        <Input
          id="season-search"
          name="search"
          defaultValue={search}
          placeholder="Search season titles…"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {search && <Link href="/direction/seasons">Clear</Link>}
      </form>
      {result.items.length ? (
        <div className="season-library-grid">
          {result.items.map((season) =>
            season.characterBanner ? (
              <Link
                key={`${season.year}-${season.quarter}`}
                className="season-library-character-banner"
                href={`/direction/seasons/${season.year}/${season.quarter}`}
                aria-label={`Open ${season.characterBanner.name}, Season ${season.quarter} ${season.year}`}
              >
                <CharacterBanner content={season.characterBanner} />
                <span className="type-label">
                  Season {season.quarter} / {season.year}{" "}
                  <ArrowRight aria-hidden="true" />
                </span>
              </Link>
            ) : (
              <SeasonPoster
                key={`${season.year}-${season.quarter}`}
                season={season}
                variant="archive"
                href={`/direction/seasons/${season.year}/${season.quarter}`}
              />
            ),
          )}
        </div>
      ) : (
        <div className="direction-library-empty">
          <BookOpen aria-hidden="true" />
          <h3>
            {search
              ? "No season matches that search."
              : "Your season library begins after you save a season."}
          </h3>
          <p>
            Opening notes, chosen character, and closing reflections stay
            together here.
          </p>
          {search && (
            <Link href="/direction/seasons">
              View every season <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
      {result.nextCursor && (
        <Link
          className="direction-next-page"
          href={`/direction/seasons?${new URLSearchParams({ ...(search ? { search } : {}), cursor: result.nextCursor }).toString()}`}
        >
          Earlier seasons <ArrowRight aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
