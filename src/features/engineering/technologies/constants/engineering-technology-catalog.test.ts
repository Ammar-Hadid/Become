import { Code2 } from "lucide-react";
import { describe, expect, it } from "vitest";
import { BUILT_IN_ENGINEERING_TECHNOLOGIES } from "./engineering-technology-catalog.constants";
import { TECHNOLOGY_CATEGORY_VALUES } from "./engineering-technology.constants";
import { EngineeringTechnologyIcon } from "../components/engineering-technology-icon.component";

describe("built-in Engineering technology catalog", () => {
  it("has unique stable IDs and canonical slugs using the existing categories", () => {
    const catalog = BUILT_IN_ENGINEERING_TECHNOLOGIES;
    expect(new Set(catalog.map((entry) => entry.id)).size).toBe(catalog.length);
    expect(new Set(catalog.map((entry) => entry.slug)).size).toBe(
      catalog.length,
    );
    for (const entry of catalog) {
      expect(entry.id).toMatch(/^builtin-tech-/);
      expect(entry.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(TECHNOLOGY_CATEGORY_VALUES).toContain(entry.category);
      expect(entry.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("resolves declared icons and falls back for null or unknown keys", () => {
    for (const entry of BUILT_IN_ENGINEERING_TECHNOLOGIES) {
      expect(EngineeringTechnologyIcon({ iconKey: entry.iconKey }).type).toBe(
        entry.iconKey ? "svg" : Code2,
      );
    }
    expect(EngineeringTechnologyIcon({ iconKey: "unknown-icon" }).type).toBe(
      Code2,
    );
    expect(EngineeringTechnologyIcon({ iconKey: "toString" }).type).toBe(Code2);
  });
});
