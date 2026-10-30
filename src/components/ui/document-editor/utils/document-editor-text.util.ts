import { getSchema, type JSONContent } from "@tiptap/core";
import { getDocumentEditorExtensions } from "@/components/ui/document-editor/config/document-editor.config";

const textSchema = getSchema(getDocumentEditorExtensions({ links: false }));

export function documentFromText(text: string): JSONContent {
  return {
    type: "doc",
    content: text.replace(/\r\n?/g, "\n").split("\n\n").map((paragraph) => ({
      type: "paragraph",
      content: paragraph.split("\n").flatMap((line, index) => [
        ...(index ? [{ type: "hardBreak" }] : []),
        ...(line ? [{ type: "text", text: line }] : []),
      ]),
    })),
  };
}

function nodeText(node: JSONContent): string {
  const children = node.content ?? [];
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "horizontalRule") return "---";
  if (node.type === "bulletList") return children.map((child) => `- ${nodeText(child)}`).join("\n");
  if (node.type === "orderedList") return children.map((child, index) => `${index + 1}. ${nodeText(child)}`).join("\n");
  if (node.type === "doc" || node.type === "blockquote") return children.map(nodeText).join("\n\n");
  if (node.type === "listItem") return children.map(nodeText).join("\n");
  return children.map(nodeText).join("");
}

export function documentToText(document: JSONContent): string {
  return nodeText(document);
}

/** Reject unsupported nodes and oversized documents before a domain persists them. */
export function validateTextDocument(input: unknown): JSONContent {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("This prompt document is invalid.");
  if (new TextEncoder().encode(JSON.stringify(input)).length > 50000) throw new Error("This prompt document is too large.");
  try {
    const node = textSchema.nodeFromJSON(input);
    node.check();
    const document = node.toJSON() as JSONContent;
    if (document.type !== "doc") throw new Error("Invalid root");
    return document;
  } catch {
    throw new Error("This prompt document contains unsupported formatting.");
  }
}
