import { describe, expect, it } from "vitest";
import {
  documentFromText,
  documentToText,
  validateTextDocument,
} from "./document-editor-text.util";

describe("shared document text conversion", () => {
  it("preserves generated prompt paragraphs and line breaks", () => {
    const text = "First line\nSecond line\n\nA second paragraph.";
    expect(documentToText(validateTextDocument(documentFromText(text)))).toBe(text);
  });

  it("retains readable list markers for copied and generated prompts", () => {
    const document = validateTextDocument({
      type: "doc",
      content: [{ type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Keep Levi visible" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Keep the world coherent" }] }] },
      ] }],
    });
    expect(documentToText(document)).toBe("- Keep Levi visible\n- Keep the world coherent");
  });

  it("rejects nodes the text editor cannot store", () => {
    expect(() => validateTextDocument({ type: "doc", content: [{ type: "image", attrs: { src: "https://example.com" } }] })).toThrow();
  });
});
