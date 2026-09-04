import { describe, expect, it } from "vitest";
import { ENGINEERING_CONTEXT_VALUES } from "@/features/engineering/constants/engineering.constants";
import { engineeringProjectSchema } from "@/features/engineering/schemas/engineering.schema";

describe("Engineering project schema", () => {
  it.each(ENGINEERING_CONTEXT_VALUES)(
    "accepts required project context %s",
    (context) => {
      const result = engineeringProjectSchema.safeParse({
        name: "Become",
        context,
        status: "ACTIVE",
      });

      expect(result.success).toBe(true);
    },
  );

  it("rejects a project without its own context", () => {
    const result = engineeringProjectSchema.safeParse({
      name: "Become",
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
  });
});
