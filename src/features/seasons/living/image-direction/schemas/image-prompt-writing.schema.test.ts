import { describe, expect, it } from "vitest";
import {
  promptGroupTargets,
  validateWrittenTargets,
  validateChapterOutline,
} from "./image-prompt-writing.schema";
import { imageOutputSpecification } from "../utils/image-prompt-package.util";
describe("image prompt writing contract", () => {
  it("covers 42 distinct chapter/state/format targets and two banner targets", () => {
    const keys = Array.from({ length: 7 }, (_, index) =>
      promptGroupTargets("CHAPTER", index + 1),
    ).flat();
    expect(keys).toHaveLength(42);
    expect(new Set(keys).size).toBe(42);
    expect(promptGroupTargets("BANNERS")).toEqual([
      "banner-desktop",
      "banner-phone",
    ]);
    expect(promptGroupTargets("PORTRAIT")).toEqual(["portrait"]);
  });
  it("rejects changed or duplicate slots rather than accepting incomplete AI output", () => {
    const description =
      "A specific, composed image description with the approved character, lighting, setting and recognizable visual details.";
    expect(() =>
      validateWrittenTargets({ directions: [{ key: "wrong", description }] }, [
        "portrait",
      ]),
    ).toThrow();
    expect(() =>
      validateWrittenTargets(
        {
          directions: [
            { key: "banner-desktop", description },
            { key: "banner-desktop", description },
          ],
        },
        promptGroupTargets("BANNERS"),
      ),
    ).toThrow();
  });
  it("rejects repeated prose across different compositions and chapters", () => {
    const description =
      "The identical composition repeated instead of adapting the framing and visible change.";
    expect(() =>
      validateWrittenTargets(
        {
          directions: promptGroupTargets("BANNERS").map((key) => ({
            key,
            description,
          })),
        },
        promptGroupTargets("BANNERS"),
      ),
    ).toThrow(/repeated/);
    expect(() =>
      validateChapterOutline({
        chapters: Array.from({ length: 7 }, (_, i) => ({
          chapter: i + 1,
          direction: description,
        })),
      }),
    ).toThrow(/repeated/);
  });
  it("rejects a direction cut off mid-sentence before it can reach artwork", () => {
    const description =
      "Keep the same geographical landmarks and character appearance, showing a closed, br";
    expect(() =>
      validateWrittenTargets(
        { directions: [{ key: "portrait", description }] },
        ["portrait"],
      ),
    ).toThrow(/mid-sentence/);
    expect(() =>
      validateChapterOutline({
        chapters: Array.from({ length: 7 }, (_, i) => ({
          chapter: i + 1,
          direction: `Chapter ${i + 1}: ${description}`,
        })),
      }),
    ).toThrow(/mid-sentence/);
  });
  it("binds provider output requirements to the selected composition", () => {
    expect(imageOutputSpecification("banner-desktop")).toEqual({
      aspectRatio: "21:9",
      resolution: "2K",
    });
    expect(imageOutputSpecification("portrait").aspectRatio).toBe("1:1");
    expect(
      imageOutputSpecification(
        promptGroupTargets("CHAPTER", 7).find((key) => key.endsWith("mobile"))!,
      ).aspectRatio,
    ).toBe("9:16");
  });
});
