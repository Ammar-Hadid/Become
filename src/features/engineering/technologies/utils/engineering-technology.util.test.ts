import { describe, expect, it } from "vitest";
import { toTechnologySlug } from "@/features/engineering/technologies/utils/engineering-technology.util";

describe("technology normalization", () => {
  it.each([
    ["React", "react"],
    ["react", "react"],
    ["React.js", "react"],
    ["Next.js", "next-js"],
    ["Node JS", "node-js"],
    ["C#", "c-sharp"],
    ["C++", "c-plus-plus"],
    ["Postgres", "postgresql"],
    ["TailwindCSS", "tailwind-css"],
  ])("normalizes %s to %s", (name, slug) => {
    expect(toTechnologySlug(name)).toBe(slug);
  });
});
