import { getSchema, type JSONContent } from "@tiptap/core";
import { TableMap } from "@tiptap/pm/tables";
import { getScriptExtensions } from "@/features/content/scripts/config/content-script-editor.config";
import {
  SCRIPT_MAX_CHARACTERS,
  SCRIPT_MAX_DOCUMENT_BYTES,
} from "@/features/content/scripts/constants/content-script.constants";
import type { ScriptDocument } from "@/features/content/scripts/types/content-script.types";
import { isScriptLinkAllowed, scriptImageUrl } from "./content-script-url.util";

const schema = getSchema(getScriptExtensions());
export class ScriptDocumentError extends Error {}

export function scriptDocumentFromText(text: string): ScriptDocument {
  return {
    schemaVersion: 1,
    content: {
      type: "doc",
      content: text
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((line) => ({
          type: "paragraph",
          ...(line ? { content: [{ type: "text", text: line }] } : {}),
        })),
    },
  };
}

function nodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "image") return String(node.attrs?.caption ?? "");
  const children = node.content ?? [];
  const separator = ["paragraph", "heading"].includes(node.type ?? "")
    ? ""
    : node.type === "tableRow"
      ? "\t"
      : "\n";
  return children.map(nodeText).join(separator);
}

export function scriptPlainText(document: ScriptDocument) {
  return nodeText(document.content);
}

export function scriptWordCount(document: ScriptDocument) {
  let words = 0;
  for (const segment of new Intl.Segmenter(undefined, {
    granularity: "word",
  }).segment(scriptPlainText(document))) {
    if (segment.isWordLike) words++;
  }
  return words;
}

export function scriptImageIds(document: ScriptDocument): string[] {
  const ids = new Set<string>();
  function visit(node: JSONContent) {
    if (node.type === "image" && typeof node.attrs?.mediaId === "string")
      ids.add(node.attrs.mediaId);
    node.content?.forEach(visit);
  }
  visit(document.content);
  return [...ids];
}

export function scriptHasContent(document: ScriptDocument) {
  return (
    Boolean(scriptPlainText(document).trim()) ||
    scriptImageIds(document).length > 0
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ScriptDocumentError(message);
}

export function validateScriptDocument(input: unknown): ScriptDocument {
  assert(
    input && typeof input === "object" && !Array.isArray(input),
    "This script could not be read.",
  );
  const candidate = input as ScriptDocument;
  assert(
    candidate.schemaVersion === 1,
    "This script uses an unsupported document format.",
  );
  assert(
    Object.keys(candidate).every((key) =>
      ["schemaVersion", "content"].includes(key),
    ),
    "This script contains unsupported document fields.",
  );
  assert(
    new TextEncoder().encode(JSON.stringify(input)).length <=
      SCRIPT_MAX_DOCUMENT_BYTES,
    "This script has too much formatting. Simplify the document before saving.",
  );
  let nodes = 0;
  function visit(node: JSONContent, depth: number) {
    assert(
      node && typeof node === "object" && !Array.isArray(node),
      "This script contains an invalid block.",
    );
    assert(
      ++nodes <= 20_000 && depth <= 32,
      "This script has too many nested blocks.",
    );
    assert(
      Object.keys(node).every((key) =>
        ["type", "attrs", "content", "marks", "text"].includes(key),
      ),
      "This script contains unsupported block fields.",
    );
    const definition = node.type ? schema.nodes[node.type] : undefined;
    assert(definition, "This script contains an unsupported block.");
    assert(
      node.attrs === undefined ||
        (node.attrs &&
          typeof node.attrs === "object" &&
          !Array.isArray(node.attrs)),
      "Invalid block formatting.",
    );
    const attrs = node.attrs ?? {};
    assert(
      Object.keys(attrs).every((key) => key in (definition.spec.attrs ?? {})),
      "This script contains unsupported formatting.",
    );
    if ("textAlign" in attrs)
      assert(
        [null, "left", "center", "right", "justify"].includes(attrs.textAlign),
        "Choose a supported alignment.",
      );
    if (node.type === "heading")
      assert([1, 2, 3].includes(attrs.level), "Choose heading 1, 2, or 3.");
    if (node.type === "orderedList" && attrs.start !== undefined)
      assert(
        Number.isInteger(attrs.start) &&
          attrs.start >= 1 &&
          attrs.start <= 1_000_000,
        "Invalid list start.",
      );
    if (node.type === "tableCell" || node.type === "tableHeader") {
      for (const key of ["colspan", "rowspan"]) {
        if (attrs[key] !== undefined)
          assert(
            Number.isInteger(attrs[key]) &&
              attrs[key] >= 1 &&
              attrs[key] <= 100,
            "Tables may span up to 100 rows or columns.",
          );
      }
      if (attrs.colwidth != null)
        assert(
          Array.isArray(attrs.colwidth) &&
            attrs.colwidth.length <= 100 &&
            attrs.colwidth.every(
              (width: unknown) =>
                typeof width === "number" &&
                Number.isInteger(width) &&
                width >= 0 &&
                width <= 4000,
            ),
          "Invalid table column width.",
        );
    }
    if (node.type === "image") {
      assert(
        typeof attrs.mediaId === "string" &&
          /^[a-zA-Z0-9_-]{1,100}$/.test(attrs.mediaId),
        "Upload the image to this script before saving.",
      );
      assert(
        attrs.src === scriptImageUrl(attrs.mediaId),
        "Script images must be stored in Become.",
      );
      assert(
        attrs.alt == null ||
          (typeof attrs.alt === "string" && attrs.alt.length <= 2000),
        "Keep image descriptions under 2,000 characters.",
      );
      assert(
        attrs.title == null ||
          (typeof attrs.title === "string" && attrs.title.length <= 2000),
        "Keep image titles under 2,000 characters.",
      );
      assert(
        attrs.caption === undefined ||
          (typeof attrs.caption === "string" && attrs.caption.length <= 6000),
        "Keep captions under 6,000 characters.",
      );
      assert(
        attrs.size === undefined ||
          ["small", "medium", "full"].includes(attrs.size),
        "Choose a supported image size.",
      );
      assert(
        attrs.decorative === undefined || typeof attrs.decorative === "boolean",
        "Invalid image description setting.",
      );
      for (const key of ["width", "height"])
        if (attrs[key] != null)
          assert(
            Number.isInteger(attrs[key]) &&
              attrs[key] > 0 &&
              attrs[key] <= 12_000,
            "Invalid image dimensions.",
          );
    }
    assert(
      node.marks === undefined || Array.isArray(node.marks),
      "Invalid text formatting.",
    );
    for (const mark of node.marks ?? []) {
      assert(
        mark && typeof mark === "object" && !Array.isArray(mark),
        "Invalid text formatting.",
      );
      const markType = schema.marks[mark.type];
      assert(
        markType &&
          Object.keys(mark).every((key) => ["type", "attrs"].includes(key)),
        "This script contains unsupported text formatting.",
      );
      assert(
        mark.attrs === undefined ||
          (mark.attrs &&
            typeof mark.attrs === "object" &&
            !Array.isArray(mark.attrs)),
        "Invalid text formatting.",
      );
      assert(
        Object.keys(mark.attrs ?? {}).every(
          (key) => key in (markType.spec.attrs ?? {}),
        ),
        "Unsupported link formatting.",
      );
      if (mark.type === "link") {
        assert(
          typeof mark.attrs?.href === "string" &&
            mark.attrs.href.length <= 4000 &&
            isScriptLinkAllowed(mark.attrs.href),
          "Links must use https, http, or mailto.",
        );
        assert(
          mark.attrs?.target == null ||
            ["_blank", "_self"].includes(mark.attrs.target),
          "Invalid link target.",
        );
        assert(
          mark.attrs?.rel == null ||
            [
              "noopener noreferrer",
              "noopener noreferrer nofollow",
              "nofollow",
              "noreferrer",
              "noopener",
            ].includes(mark.attrs.rel),
          "Invalid link relationship.",
        );
        assert(
          mark.attrs?.class == null,
          "Custom link styling is not supported.",
        );
      }
    }
    assert(
      node.content === undefined || Array.isArray(node.content),
      "Invalid block content.",
    );
    node.content?.forEach((child) => visit(child, depth + 1));
  }
  visit(candidate.content, 0);
  assert(candidate.content.type === "doc", "A script must contain a document.");
  try {
    const document = schema.nodeFromJSON(candidate.content);
    document.check();
    document.descendants((node) => {
      if (node.type.name === "table") {
        const map = TableMap.get(node);
        assert(
          !map.problems?.length && map.width <= 100 && map.height <= 100,
          "This table has an invalid layout or is too large.",
        );
      }
    });
  } catch (error) {
    if (error instanceof ScriptDocumentError) throw error;
    throw new ScriptDocumentError(
      "This script contains an invalid document structure.",
    );
  }
  assert(
    scriptPlainText(candidate).length <= SCRIPT_MAX_CHARACTERS,
    "Scripts can contain up to 120,000 characters. Your draft has not been truncated.",
  );
  return candidate;
}
