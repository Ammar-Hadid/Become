import { describe, expect, it } from "vitest";
import type { ScriptDocument } from "@/features/content/scripts/types/content-script.types";
import {
  scriptDocumentFromText,
  scriptHasContent,
  scriptImageIds,
  scriptPlainText,
  scriptWordCount,
  validateScriptDocument,
} from "./content-script-document.util";
import { scriptImageUrl } from "./content-script-url.util";

describe("script documents", () => {
  it("keeps legacy markup literal and preserves blank lines", () => {
    const text = "<b>Not HTML</b>\n\n# Not Markdown\nFinal line\n";
    const document = validateScriptDocument(scriptDocumentFromText(text));
    expect(scriptPlainText(document)).toBe(text);
    expect(document.content.content?.[0].content?.[0]).toEqual({
      type: "text",
      text: "<b>Not HTML</b>",
    });
  });
  it("distinguishes an empty document from a script with an image", () => {
    expect(scriptHasContent(scriptDocumentFromText(" \n\n"))).toBe(false);
    const doc: ScriptDocument = {
      schemaVersion: 1,
      content: {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: {
              mediaId: "owned-image",
              src: scriptImageUrl("owned-image"),
              alt: "A storyboard",
            },
          },
        ],
      },
    };
    expect(scriptHasContent(validateScriptDocument(doc))).toBe(true);
    expect(scriptImageIds(doc)).toEqual(["owned-image"]);
    expect(scriptWordCount(doc)).toBe(0);
  });
  it("counts words in scripts without assuming spaces between all languages", () => {
    expect(scriptWordCount(scriptDocumentFromText("One clear opening."))).toBe(
      3,
    );
    expect(scriptWordCount(scriptDocumentFromText("你好世界"))).toBeGreaterThan(
      0,
    );
  });
  it("rejects oversized or unsupported formatting without truncation", () => {
    expect(() =>
      validateScriptDocument(scriptDocumentFromText("x".repeat(120001))),
    ).toThrow(/120,000/);
    const doc = scriptDocumentFromText("Keep me");
    doc.content.content![0].attrs = { fontSize: "90px" };
    expect(() => validateScriptDocument(doc)).toThrow(/unsupported formatting/);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://ok.test\nmalicious",
    "file:///secret",
  ])("rejects unsafe link %s", (href) => {
    const doc = scriptDocumentFromText("Link");
    doc.content.content![0].content![0].marks = [
      { type: "link", attrs: { href } },
    ];
    expect(() => validateScriptDocument(doc)).toThrow(/Links must/);
  });
  it("checks table layout and image sources", () => {
    const doc: ScriptDocument = {
      schemaVersion: 1,
      content: {
        type: "doc",
        content: [
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: [
                  { type: "tableCell", content: [{ type: "paragraph" }] },
                ],
              },
              { type: "tableRow", content: [] },
            ],
          },
        ],
      },
    };
    expect(() => validateScriptDocument(doc)).toThrow(/structure|table/);
    doc.content.content = [
      {
        type: "image",
        attrs: { src: "https://other.test/a.png", mediaId: "owned-image" },
      },
    ];
    expect(() => validateScriptDocument(doc)).toThrow(/stored in Become/);
  });
});
