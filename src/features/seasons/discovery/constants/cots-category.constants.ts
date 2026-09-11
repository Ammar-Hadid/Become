import type { CotsCategory } from "@/features/seasons/discovery/types/cots-discovery.types";

export const COTS_CATEGORY_VERSION = 1;
export const COTS_CATEGORIES: ReadonlyArray<{
  value: CotsCategory;
  label: string;
  workLabel: string;
  adaptationLabel: string;
  subjectKind: "FICTIONAL" | "PERSON";
}> = [
  {
    value: "anime",
    label: "Anime",
    workLabel: "Anime or manga",
    adaptationLabel: "Version or adaptation",
    subjectKind: "FICTIONAL",
  },
  {
    value: "tv",
    label: "TV show",
    workLabel: "TV show",
    adaptationLabel: "Season, portrayal, or version",
    subjectKind: "FICTIONAL",
  },
  {
    value: "movie",
    label: "Movie",
    workLabel: "Movie",
    adaptationLabel: "Year, portrayal, or version",
    subjectKind: "FICTIONAL",
  },
  {
    value: "game",
    label: "Game",
    workLabel: "Game",
    adaptationLabel: "Entry, platform, or version",
    subjectKind: "FICTIONAL",
  },
  {
    value: "book",
    label: "Book",
    workLabel: "Book or series",
    adaptationLabel: "Edition or adaptation",
    subjectKind: "FICTIONAL",
  },
  {
    value: "comic",
    label: "Comic",
    workLabel: "Comic, publisher, or run",
    adaptationLabel: "Run, issue, or adaptation",
    subjectKind: "FICTIONAL",
  },
  {
    value: "person",
    label: "Public figure / real-life person",
    workLabel: "Known for (optional)",
    adaptationLabel: "Era, team, or role (optional)",
    subjectKind: "PERSON",
  },
];
export const cotsCategory = (value: string | null | undefined) =>
  COTS_CATEGORIES.find((category) => category.value === value);
