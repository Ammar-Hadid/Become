import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import type { ScriptDocument } from "@/features/content/scripts/types/content-script.types";
import { createScriptDocx } from "./content-script-docx.util";
import { checkScriptDocxArchive } from "./content-script-import.util";

describe("script document files", () => {
  it("exports real Word headings, formatting, links, lists, and table cells", async () => {
    const paragraph = (text: string) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    });
    const document: ScriptDocument = {
      schemaVersion: 1,
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Opening" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Emphasis",
                marks: [{ type: "bold" }, { type: "italic" }],
              },
              {
                type: "text",
                text: " source",
                marks: [
                  { type: "link", attrs: { href: "https://example.com/" } },
                ],
              },
            ],
          },
          {
            type: "bulletList",
            content: [
              { type: "listItem", content: [paragraph("First point")] },
            ],
          },
          {
            type: "orderedList",
            attrs: { start: 3 },
            content: [{ type: "listItem", content: [paragraph("Third beat")] }],
          },
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: [
                  { type: "tableHeader", content: [paragraph("Scene")] },
                  { type: "tableCell", content: [paragraph("Action")] },
                ],
              },
            ],
          },
        ],
      },
    };
    const blob = await createScriptDocx(
      document,
      "Script",
      { font: "Geist", body: 24, headings: [36, 30, 26] },
      new Map(),
    );
    const bytes = await blob.arrayBuffer();
    expect(() => checkScriptDocxArchive(bytes)).not.toThrow();
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
    expect(result.value).toContain("<h1>Opening</h1>");
    expect(result.value).toContain("<strong><em>Emphasis</em></strong>");
    expect(result.value).toContain('href="https://example.com/"');
    expect(result.value).toContain("<ul>");
    expect(result.value).toContain("<ol>");
    expect(result.value).toContain("<table>");
    expect(result.value).toContain("Action");
  });
  it("rejects invalid and oversized Word archives before conversion", () => {
    expect(() => checkScriptDocxArchive(new ArrayBuffer(4))).toThrow(
      /Word document/,
    );
    expect(() =>
      checkScriptDocxArchive(new ArrayBuffer(10 * 1024 * 1024 + 1)),
    ).toThrow(/10 MB/);
  });
});
